// === CONFIGURATION ===
const rooms = ['ห้องประชุม 1', 'ห้องประชุม 2', 'ห้องประชุม 3'];
const startHour = 8;
const endHour = 18;
const totalHours = endHour - startHour;
const colors = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6'];

// === DOM ELEMENTS ===
const timeline = document.getElementById('timeline');
const roomsCol = document.getElementById('roomsCol');
const datePicker = document.getElementById('datePicker');
const scheduleWrapper = document.querySelector('.schedule-wrapper');
const scheduleContainer = document.querySelector('.schedule-container');
const leftColumn = document.querySelector('.left-column');

// === STATE ===
let currentMeetings = [];
let currentDateStr = new Date().toISOString().substring(0, 10);  // utc +0
if (datePicker) datePicker.value = currentDateStr;

// === UTILITIES ===
function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function timeToDecimalHours(timeStr) {
  const dt = new Date(timeStr);
  return dt.getHours() + dt.getMinutes() / 60 - startHour;
}

function getCssInt(variableName) {
  return parseInt(getComputedStyle(document.documentElement).getPropertyValue(variableName), 10);
}

function getHourWidth() {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour-width').trim()) || 80;
}

// === UI BUILDERS ===
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
  const hourWidth = getHourWidth();
  for (let h = startHour; h <= endHour; h++) {
    const label = document.createElement('div');
    label.classList.add('time-label');
    label.style.width = hourWidth + 'px';
    label.textContent = `${h}:00`;
    timeline.appendChild(label);
  }
  timeline.style.width = ((totalHours + 1) * hourWidth) + 'px';
}

function clearMeetings() {
  document.querySelectorAll('.meeting-block').forEach(mb => mb.remove());
}

function renderMeetings(meetings) {
  clearMeetings();
  const hourWidth = getHourWidth();
  const headerHeight = getCssInt('--header-height');
  const rowHeight = getCssInt('--row-height');

  meetings.forEach((m, i) => {
    if (m.approval && m.approval !== 'อนุมัติ') return;
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
    meetingDiv.style.left = clampedStart * hourWidth + 'px';
    meetingDiv.style.width = duration * hourWidth + 'px';
    meetingDiv.style.top = headerHeight + roomIndex * rowHeight + 0.1 * rowHeight + 'px';
    meetingDiv.style.height = rowHeight * 0.8 + 'px';

    const participantCount = m.participants ? m.participants.length : 0;
    const meetingText = `
      <div class="meeting-line">${m.purpose}</div>
      <div class="meeting-line">ผู้จอง ${m.employee?.name || 'ไม่ระบุ'} </div>
      <div class="meeting-line">ผู้เข้าร่วม ${participantCount} คน</div>
      <div class="meeting-line">
        ${new Date(m.datetimein).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} น. -
        ${new Date(m.datetimeout).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} น.
      </div>
    `;

    meetingDiv.innerHTML = `
      <div class="meeting-content-wrapper">
        <div class="meeting-content">
          <div class="meeting-set">${meetingText}</div>
        </div>
      </div>
    `;
    
    // Event Listener for Pop-up
    meetingDiv.addEventListener('click', () => {
      showMeetingPopup(m);
    });

    timeline.appendChild(meetingDiv);
  });
}

function renderGridOverlay() {
  const old = document.querySelector('.grid-overlay');
  if (old) old.remove();

  const hourWidth = getHourWidth();
  const rowHeight = getCssInt('--row-height');
  const headerHeight = getCssInt('--header-height');

  const overlay = document.createElement('div');
  overlay.className = 'grid-overlay';
  overlay.style.width = (totalHours + 1) * hourWidth + 'px';
  overlay.style.height = rooms.length * rowHeight + 'px';
  overlay.style.top = headerHeight + 'px';

  timeline.appendChild(overlay);
}

function updateHourWidth() {
  const totalContainerWidth = scheduleContainer.clientWidth;
  const leftColumnWidth = leftColumn.clientWidth || 140;
  let hourWidthPx = (totalContainerWidth - leftColumnWidth) / (totalHours + 1);
  const minHourWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour-min-width')) || 60;

  hourWidthPx = Math.max(hourWidthPx, minHourWidth);
  hourWidthPx = Math.floor(hourWidthPx);

  document.documentElement.style.setProperty('--hour-width', `${hourWidthPx}px`);
  timeline.style.width = (totalHours + 1) * hourWidthPx + 'px';
}

function updateScheduleWrapperHeight() {
  const rowHeight = getCssInt('--row-height');
  const headerHeight = getCssInt('--header-height');
  scheduleWrapper.style.height = `${headerHeight + rowHeight * rooms.length}px`;
}

// === SCHEDULE REFRESH ===
function refreshSchedule() {
  updateHourWidth();
  buildTimelineHeader();
  buildRooms();
  renderMeetings(currentMeetings);
  renderGridOverlay();
  updateScheduleWrapperHeight();
}

// === SOCKET.IO SETUP ===
const socket = io();

socket.on('connect', () => {
  console.log('[Socket] Connected. Initializing...');
  initialize();
});

socket.on('scheduleUpdate', (meetings) => {
  console.log('[Socket] Schedule update received for date:', currentDateStr);
  currentMeetings = meetings;
  refreshSchedule();
});

// === REQUESTING SCHEDULE ===
function requestSchedule(dateStr) {
  console.log('[Emit] Requesting schedule for date:', dateStr);
  socket.emit('requestSchedule', { date: dateStr });
}


// === INITIALIZE ON LOAD ===
function initialize() {
  if (typeof selectedDateFromServer !== 'undefined' && selectedDateFromServer) {
    currentDateStr = selectedDateFromServer;
    if (datePicker) datePicker.value = currentDateStr;
  }
  currentMeetings = [];
  refreshSchedule();
  requestSchedule(currentDateStr);
}

// === POPUP FUNCTIONALITY (Wrapped in DOMContentLoaded) ===

// Declare variables for modal elements, but assign them inside the listener
let meetingModal, closeModal, modalPurpose, modalEmployee, modalParticipants, modalTime;

document.addEventListener('DOMContentLoaded', () => {
    // Now that the DOM is loaded, we can safely get the elements
    meetingModal = document.getElementById('meetingModal');
    closeModal = document.querySelector('.close-button');
    modalPurpose = document.getElementById('modalPurpose');
    modalEmployee = document.getElementById('modalEmployee');
    modalParticipants = document.getElementById('modalParticipants');
    modalTime = document.getElementById('modalTime');
    
    // Add event listeners for closing the modal
    if (closeModal) {
      closeModal.addEventListener('click', () => {
        meetingModal.style.display = 'none';
      });
    }

    window.addEventListener('click', e => {
      if (e.target == meetingModal) {
        meetingModal.style.display = 'none';
      }
    });
});

function showMeetingPopup(meeting) {
  // Check if modal elements are ready before trying to use them
  if (!meetingModal) {
    console.error('Modal elements not found!');
    return;
  }

  modalPurpose.textContent = meeting.purpose || '-';
  modalEmployee.textContent = meeting.employee?.name || 'ไม่ระบุ';
  
  modalParticipants.innerHTML = '';

  if (meeting.participants && meeting.participants.length > 0) {
    meeting.participants.forEach(p => {
      const li = document.createElement('li');
      li.textContent = p.name;
      modalParticipants.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.textContent = 'ไม่มีผู้เข้าร่วม';
    modalParticipants.appendChild(li);
  }

  const startTime = new Date(meeting.datetimein).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = new Date(meeting.datetimeout).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  modalTime.textContent = `${startTime} น. - ${endTime} น.`;

  meetingModal.style.display = 'block';
}


// === OTHER EVENT LISTENERS ===
if (datePicker) {
  datePicker.addEventListener('change', e => {
    currentDateStr = e.target.value;
    requestSchedule(currentDateStr);
  });
}

window.addEventListener('resize', () => {
  refreshSchedule();
});