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
  const hourWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour-width').trim()) || 120;
  for (let h = startHour; h <= endHour; h++) {
    const label = document.createElement('div');
    label.classList.add('time-label');
    label.style.width = hourWidth + 'px';
    label.textContent = `${h}:00`;
    timeline.appendChild(label);
  }
  timeline.style.width = ((totalHours + 1) * hourWidth) + 'px';
}

function timeToDecimalHours(timeStr) {
  const dt = new Date(timeStr);
  return (dt.getHours() + dt.getMinutes() / 60) - startHour;
}

function clearMeetings() {
  document.querySelectorAll('.meeting-block').forEach(mb => mb.remove());
}

function renderMeetings(meetings) {
  clearMeetings();
  const hourWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour-width').trim()) || 120;
  const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10);
  const rowHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--row-height'), 10);

  meetings.forEach((m, i) => {
    const roomIndex = rooms.indexOf(m.room);
    if (roomIndex === -1) return;
    let start = timeToDecimalHours(m.datetimein);
    let end = timeToDecimalHours(m.datetimeout);
    if (end <= start) return;
    const clampedStart = Math.max(0, start);
    const clampedEnd = Math.min(totalHours, end);
    const duration = clampedEnd - clampedStart;
    if (duration <= 0) return;

    const meetingDiv = document.createElement('div');
    meetingDiv.classList.add('meeting-block');
    meetingDiv.style.backgroundColor = colors[i % colors.length];
    meetingDiv.style.left = (clampedStart * hourWidth) + 'px';
    meetingDiv.style.width = (duration * hourWidth) + 'px';
    meetingDiv.style.top = headerHeight + (roomIndex * rowHeight) + (0.1 * rowHeight) + 'px';
    meetingDiv.style.height = ((rowHeight * 0.8)) + 'px';

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

function renderGridOverlay() {
  const existingOverlay = document.querySelector('.grid-overlay');
  if (existingOverlay) existingOverlay.remove();

  const hourWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour-width').trim()) || 120;
  const rowHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--row-height'), 10);
  const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10);

  const overlay = document.createElement('div');
  overlay.className = 'grid-overlay';
  overlay.style.width = `${(totalHours + 1) * hourWidth}px`;
  overlay.style.height = `${rooms.length * rowHeight}px`;
  overlay.style.top = `${headerHeight}px`;
  timeline.appendChild(overlay);
}

function updateHourWidth() {
  const scheduleContainer = document.querySelector('.schedule-container');
  const leftColumn = document.querySelector('.left-column');
  const totalContainerWidth = scheduleContainer.clientWidth;
  let leftColumnWidth = Math.max(120, Math.min(180, totalContainerWidth * 0.2));
  leftColumn.style.width = `${leftColumnWidth}px`;

  const timelineWidth = totalContainerWidth - leftColumnWidth;
  let hourWidthPx = timelineWidth / (totalHours + 1);
  const minHourWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour-min-width')) || 80;
  hourWidthPx = Math.max(hourWidthPx, minHourWidth);

  // ROUND to avoid subpixel rendering gaps
  hourWidthPx = Math.round(hourWidthPx);

  document.documentElement.style.setProperty('--hour-width', `${hourWidthPx}px`);

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
  renderGridOverlay();
}

socket.on('connect', () => {
  initialize();
});

socket.on('scheduleUpdate', meetings => {
  currentMeetings = meetings;
  refreshSchedule();
});

if (datePicker) {
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
