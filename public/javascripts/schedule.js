// Config
const rooms = ['Room A', 'Room B', 'Room C'];
const hourWidth = 60; // px per hour

// Populate room names on left
const roomsCol = document.getElementById('roomsCol');
rooms.forEach(room => {
  const div = document.createElement('div');
  div.classList.add('room');
  div.textContent = room;
  roomsCol.appendChild(div);
});

// Populate time labels 0-23
const timeLabels = document.getElementById('timeLabels');
for (let h = 0; h <= 23; h++) {
  const label = document.createElement('div');
  label.classList.add('time-label');
  label.style.flex = `0 0 ${hourWidth}px`;
  label.textContent = `${h}:00`;
  timeLabels.appendChild(label);
}

// Populate room rows container
const roomRows = document.getElementById('roomRows');
rooms.forEach(room => {
  const row = document.createElement('div');
  row.classList.add('room-row');
  row.dataset.room = room;
  row.style.width = `${24 * hourWidth}px`; // 24 hours wide
  roomRows.appendChild(row);
});

// Helper to convert ISO datetime string to decimal hours
function timeToDecimalHours(timeStr) {
  const dt = new Date(timeStr);
  return dt.getHours() + dt.getMinutes() / 60;
}

// Color palette for meetings
const colors = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6'];

// Connect to Socket.IO server
const socket = io();

// Function to clear existing meeting blocks
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

    if(duration <= 0) return; // skip invalid meeting times

    const meetingDiv = document.createElement('div');
    meetingDiv.classList.add('meeting-block');
    meetingDiv.style.left = `${start * hourWidth}px`;
    meetingDiv.style.width = `${duration * hourWidth}px`;
    meetingDiv.style.backgroundColor = colors[i % colors.length];
    meetingDiv.title = `${m.name} (${m.room})\n${new Date(m.datetimein).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${new Date(m.datetimeout).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    meetingDiv.textContent = m.name;

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
