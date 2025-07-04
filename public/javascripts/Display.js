// Config
const rooms = ['ห้องประชุม 1', 'ห้องประชุม 2', 'ห้องประชุม 3'];
const hourWidth = 205; // px per hour
const startHour = 8;   // Start at 8:00
const endHour = 19;    // End at 19:00 (exclusive)

// Populate room names on left
const roomsCol = document.getElementById('roomsCol');
rooms.forEach(room => {
  const div = document.createElement('div');
  div.classList.add('room');
  div.textContent = room;
  roomsCol.appendChild(div);
});

// Populate time labels 8-18 (10 hours)
const timeLabels = document.getElementById('timeLabels');
for (let h = startHour; h < endHour; h++) {
  const label = document.createElement('div');
  label.classList.add('time-label');
  label.style.flex = `0 0 ${hourWidth}px`;
  label.textContent = `${h}:00`;
  timeLabels.appendChild(label);
}

const timeline = document.querySelector('.timeline');
for (let h = startHour; h < endHour; h++) {
  const line = document.createElement('div');
  line.classList.add('hour-line');
  line.style.left = `${(h - 8) * hourWidth}px`; // align with time labels
  timeline.appendChild(line);
}

// Populate room rows container
const roomRows = document.getElementById('roomRows');
rooms.forEach(room => {
  const row = document.createElement('div');
  row.classList.add('room-row');
  row.dataset.room = room;
  row.style.width = `${(endHour - startHour) * hourWidth}px`; // width for 10 hours
  roomRows.appendChild(row);
});

// Helper to convert ISO datetime string to decimal hours offset by startHour
function timeToDecimalHours(timeStr) {
  const dt = new Date(timeStr);
  return (dt.getHours() + dt.getMinutes() / 60) - startHour; // offset so 8:00 = 0px
}

// Color palette for meetings
const colors = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6'];

// Connect to Socket.IO server
const socket = io();

/// Function to clear existing meeting blocks
function clearMeetings() {
  [...roomRows.children].forEach(row => {
    row.querySelectorAll('.meeting-block').forEach(mb => mb.remove());
  });
}

// Render meetings into schedule UI
function renderMeetings(meetings) {
  clearMeetings();

  meetings.forEach((m, i) => {
    const roomRow = [...roomRows.children].find(r => r.dataset.room === m.room);
    if (!roomRow) return;

    const start = timeToDecimalHours(m.datetimein);
    const end = timeToDecimalHours(m.datetimeout);
    const duration = end - start;

    // Only render if inside displayed hours range and duration positive
    if (duration <= 0) return;
    if (end <= 0 || start >= (endHour - startHour)) return; // outside visible range

    // Clamp position and width if partially outside range
    const clampedStart = Math.max(0, start);
    const clampedEnd = Math.min(endHour - startHour, end);
    const clampedDuration = clampedEnd - clampedStart;

    const meetingDiv = document.createElement('div');
    meetingDiv.classList.add('meeting-block');
    meetingDiv.style.left = `${clampedStart * hourWidth}px`;
    meetingDiv.style.width = `${clampedDuration * hourWidth}px`;
    meetingDiv.style.backgroundColor = colors[i % colors.length];

    const firstName = m.employee?.name?.split(' ')[0] || "Unknown";
    const participantCount = m.participants ? m.participants.length : 0;

     meetingDiv.innerHTML = `${m.purpose}<br>${m.employee.name} (${participantCount} participant${participantCount !== 1 ? 's' : ''})<br>${new Date(m.datetimein).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} น. - ${new Date(m.datetimeout).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} น.`;

    roomRow.appendChild(meetingDiv);
  });
}

// Date picker element (already in HTML)
const datePicker = document.getElementById('datePicker');
const todayStr = new Date().toISOString().substring(0, 10);
datePicker.value = todayStr;

// Function to request schedule for a given date
function requestSchedule(dateStr) {
  socket.emit('requestSchedule', { date: dateStr });
}

// On socket connect, request schedule for today's date
socket.on('connect', () => {
  requestSchedule(todayStr);
});

// Listen for date changes and request new schedules
datePicker.addEventListener('change', (e) => {
  const selectedDate = e.target.value;
  if (selectedDate) {
    requestSchedule(selectedDate);
  }
});

// Receive schedule updates from server
socket.on('scheduleUpdate', (meetings) => {
  renderMeetings(meetings);
});
