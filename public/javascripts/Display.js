const rooms = ['ห้องประชุม 1', 'ห้องประชุม 2', 'ห้องประชุม 3'];
const startHour = 8;
const endHour = 18;
const totalHours = endHour - startHour;

const timeline = document.getElementById('timeline');
const roomsCol = document.getElementById('roomsCol');

const colors = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6'];

let currentMeetings = [];

function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function buildRooms() {
  clearChildren(roomsCol);
  rooms.forEach(room => {
    const div = document.createElement('div');
    div.classList.add('room');
    div.textContent = room;
    roomsCol.appendChild(div);
  });
}

function buildTimelineHeader() {
  clearChildren(timeline);

  // Get hour width from CSS, fallback 60
  const hourWidthStr = getComputedStyle(document.documentElement).getPropertyValue('--hour-width').trim();
  const hourWidth = hourWidthStr.endsWith('px') ? parseFloat(hourWidthStr) : 60;

  for(let h = startHour; h <= endHour; h++) {
    const label = document.createElement('div');
    label.classList.add('time-label');
    label.style.width = hourWidth + 'px';
    label.textContent = `${h}:00`;
    timeline.appendChild(label);
  }

  timeline.style.width = ((totalHours + 1) * hourWidth) + 'px';
}

// Convert ISO datetime string to decimal hours relative to startHour
function timeToDecimalHours(timeStr) {
  const dt = new Date(timeStr);
  return (dt.getHours() + dt.getMinutes() / 60) - startHour;
}

function clearMeetings() {
  document.querySelectorAll('.meeting-block').forEach(mb => mb.remove());
}

function renderMeetings(meetings) {
  clearMeetings();

  const hourWidthStr = getComputedStyle(document.documentElement).getPropertyValue('--hour-width').trim();
  const hourWidth = hourWidthStr.endsWith('px') ? parseFloat(hourWidthStr) : 60;

  const rootStyles = getComputedStyle(document.documentElement);
  const headerHeight = parseInt(rootStyles.getPropertyValue('--header-height')) || 220;
  const rowHeight = parseInt(rootStyles.getPropertyValue('--row-height')) || 220;

  meetings.forEach((m, i) => {
    const roomIndex = rooms.indexOf(m.room);
    if(roomIndex === -1) return;

    let start = timeToDecimalHours(m.datetimein);
    let end = timeToDecimalHours(m.datetimeout);
    if(end <= start) return;

    const clampedStart = Math.max(0, start);
    const clampedEnd = Math.min(totalHours, end);
    const duration = clampedEnd - clampedStart;
    if(duration <= 0) return;

    const meetingDiv = document.createElement('div');
    meetingDiv.classList.add('meeting-block');
    meetingDiv.style.backgroundColor = colors[i % colors.length];

    meetingDiv.style.left = (clampedStart * hourWidth) + 'px';
    meetingDiv.style.width = (duration * hourWidth) + 'px';
    meetingDiv.style.top = headerHeight + (roomIndex * rowHeight) + (0.1 * rowHeight) + 'px';
    meetingDiv.style.height = (rowHeight * 0.8) + 'px';

    const participantCount = m.participants ? m.participants.length : 0;

    const meetingText = `
      <div class="meeting-line">${m.purpose}</div>
      <div class="meeting-line">${m.employee.name} - ผู้เข้าร่วมการประชุม ${participantCount} คน</div>
      <div class="meeting-line">
        ${new Date(m.datetimein).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} น. -
        ${new Date(m.datetimeout).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} น.
      </div>
    `;

    meetingDiv.innerHTML = `
      <div class="meeting-content-wrapper">
        <div class="meeting-content">
          <div class="meeting-set">${meetingText}</div>
          <div class="meeting-set">${meetingText}</div>
        </div>
      </div>
    `;

    timeline.appendChild(meetingDiv);
  });
}

function updateHourWidth() {
  const scheduleContainer = document.querySelector('.schedule-container');
  const leftColumn = document.querySelector('.left-column');

  const totalContainerWidth = scheduleContainer.clientWidth;

  // Define min and max left column widths (match your CSS vars or hardcode)
  const leftMin = 120;
  const leftMax = 180;

  // Calculate desired left column width as ~20% of container width or fallback to default 160
  // You can adjust this ratio as you want
  let desiredLeftWidth = totalContainerWidth * 0.2;

  // Clamp left column width between min and max
  let leftColumnWidth = Math.min(leftMax, Math.max(leftMin, desiredLeftWidth));

  // Apply the width explicitly to left column
  leftColumn.style.width = leftColumnWidth + 'px';

  // Calculate available width for timeline
  const timelineWidth = totalContainerWidth - leftColumnWidth;

  // Calculate hour width for timeline with min hour width (80px)
  let hourWidthPx = timelineWidth / (totalHours + 1);
  const minHourWidthStr = getComputedStyle(document.documentElement).getPropertyValue('--hour-min-width').trim();
  const minHourWidth = minHourWidthStr.endsWith('px') ? parseFloat(minHourWidthStr) : 80;

  hourWidthPx = Math.max(hourWidthPx, minHourWidth);

  document.documentElement.style.setProperty('--hour-width', `${hourWidthPx}px`);

  // Set timeline width accordingly
  const timeline = document.getElementById('timeline');
  if (timeline) {
    timeline.style.width = `${(totalHours + 1) * hourWidthPx}px`;
  }
}


const socket = io();

const datePicker = document.getElementById('datePicker');
const todayStr = new Date().toISOString().substring(0, 10);
if (datePicker) datePicker.value = todayStr;

function refreshSchedule() {
  updateHourWidth();
  buildTimelineHeader();
  buildRooms();
  renderMeetings(currentMeetings);
}

socket.on('connect', () => {
  initialize();
});

socket.on('scheduleUpdate', meetings => {
  currentMeetings = meetings;
  refreshSchedule();
});

if(datePicker) {
  datePicker.addEventListener('change', e => {
    requestSchedule(e.target.value);
  });
}

function initialize() {
  currentMeetings = [];
  refreshSchedule();
  requestSchedule(datePicker ? datePicker.value : todayStr);
}

function requestSchedule(dateStr) {
  socket.emit('requestSchedule', { date: dateStr });
}

window.addEventListener('resize', () => {
  refreshSchedule();
});
