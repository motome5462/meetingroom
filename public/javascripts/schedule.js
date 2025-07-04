// Config
const rooms = ['ห้องประชุม 1', 'ห้องประชุม 2', 'ห้องประชุม 3'];
const hourWidth = 200; // px per hour
const startHour = 8;
const endHour = 19;

// Populate room names on left
const roomsCol = document.getElementById('roomsCol');
rooms.forEach(room => {
  const div = document.createElement('div');
  div.classList.add('room');
  div.textContent = room;
  roomsCol.appendChild(div);
});

// Populate time labels
const timeLabels = document.getElementById('timeLabels');
for (let h = startHour; h < endHour; h++) {
  const label = document.createElement('div');
  label.classList.add('time-label');
  label.style.flex = `0 0 ${hourWidth}px`;
  label.textContent = `${h}:00`;
  timeLabels.appendChild(label);
}

// Hour vertical lines
const timeline = document.querySelector('.timeline');
for (let h = startHour; h < endHour; h++) {
  const line = document.createElement('div');
  line.classList.add('hour-line');
  line.style.left = `${(h - startHour) * hourWidth}px`;
  timeline.appendChild(line);
}

// Room rows
const roomRows = document.getElementById('roomRows');
rooms.forEach(room => {
  const row = document.createElement('div');
  row.classList.add('room-row');
  row.dataset.room = room;
  row.style.width = `${(endHour - startHour) * hourWidth}px`;
  roomRows.appendChild(row);
});

// Helper: Convert ISO string to hours since startHour
function timeToDecimalHours(timeStr) {
  const dt = new Date(timeStr);
  return (dt.getHours() + dt.getMinutes() / 60) - startHour;
}

// Meeting colors
const colors = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6'];

// Socket connection
const socket = io();

// Clear all existing meetings
function clearMeetings() {
  [...roomRows.children].forEach(row => {
    row.querySelectorAll('.meeting-block').forEach(mb => mb.remove());
  });
}

// Render meeting blocks
function renderMeetings(meetings) {
  clearMeetings();

  meetings.forEach((m, i) => {
    const roomRow = [...roomRows.children].find(r => r.dataset.room === m.room);
    if (!roomRow) return;

    const start = timeToDecimalHours(m.datetimein);
    const end = timeToDecimalHours(m.datetimeout);
    const duration = end - start;

    if (duration <= 0 || end <= 0 || start >= (endHour - startHour)) return;

    const clampedStart = Math.max(0, start);
    const clampedEnd = Math.min(endHour - startHour, end);
    const clampedDuration = clampedEnd - clampedStart;

    const blockWidth = clampedDuration * hourWidth;
    const meetingDiv = document.createElement('div');
    meetingDiv.classList.add('meeting-block');
    meetingDiv.style.left = `${clampedStart * hourWidth}px`;
    meetingDiv.style.width = `${blockWidth}px`;
    meetingDiv.style.backgroundColor = colors[i % colors.length];

    // Adjust font size based on width
    const fontSize = Math.max(16, Math.min(24, blockWidth / 16));
    meetingDiv.style.fontSize = `${fontSize}px`;

    const firstName = m.employee?.name?.split(' ')[0] || "Unknown";
    const participantCount = m.participants ? m.participants.length : 0;

    meetingDiv.innerHTML = `
      ${m.purpose}<br>
      ${m.employee.name} (${participantCount} participant${participantCount !== 1 ? 's' : ''})<br>
      ${new Date(m.datetimein).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} น. - 
      ${new Date(m.datetimeout).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} น.
    `;

    roomRow.appendChild(meetingDiv);
  });
}

// Handle date picker
const datePicker = document.getElementById('datePicker');
const todayStr = new Date().toISOString().substring(0, 10);
datePicker.value = todayStr;

function requestSchedule(dateStr) {
  socket.emit('requestSchedule', { date: dateStr });
}

socket.on('connect', () => {
  requestSchedule(todayStr);
});

datePicker.addEventListener('change', (e) => {
  const selectedDate = e.target.value;
  if (selectedDate) {
    requestSchedule(selectedDate);
  }
});

// Receive schedule updates
socket.on('scheduleUpdate', (meetings) => {
  renderMeetings(meetings);
});
