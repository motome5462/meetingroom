// List of meeting rooms (can be modified as needed)
const rooms = ['ห้องประชุม 1', 'ห้องประชุม 2', 'ห้องประชุม 3'];

// Define schedule hours range (8 AM to 6 PM)
const startHour = 8;
const endHour = 18;
const totalHours = endHour - startHour;  // Number of hours shown

// DOM elements for timeline and rooms column
const timeline = document.getElementById('timeline');
const roomsCol = document.getElementById('roomsCol');

// Colors array for meeting blocks, will cycle through these
const colors = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6'];

// Store current meetings fetched from server
let currentMeetings = [];

// Remove all child elements from a given element
function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

// Build the list of room names in the left column
function buildRooms() {
  clearChildren(roomsCol);
  rooms.forEach(room => {
    const div = document.createElement('div');
    div.classList.add('room');
    div.textContent = room;
    roomsCol.appendChild(div);
  });
}

// Build the timeline header with hour labels
function buildTimelineHeader() {
  clearChildren(timeline);

  // Get the width of each hour block from CSS variable, default to 120px
  const hourWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour-width').trim()) || 120;

  // Create a label for each hour in the range
  for (let h = startHour; h <= endHour; h++) {
    const label = document.createElement('div');
    label.classList.add('time-label');
    label.style.width = hourWidth + 'px';
    label.textContent = `${h}:00`;
    timeline.appendChild(label);
  }

  // Set the timeline container width to fit all hour labels
  timeline.style.width = ((totalHours + 1) * hourWidth) + 'px';
}

// Convert a datetime string into decimal hours offset from startHour
// Example: "2023-07-09T10:30" → 2.5 if startHour = 8
function timeToDecimalHours(timeStr) {
  const dt = new Date(timeStr);
  return (dt.getHours() + dt.getMinutes() / 60) - startHour;
}

// Remove all existing meeting blocks from the timeline
function clearMeetings() {
  document.querySelectorAll('.meeting-block').forEach(mb => mb.remove());
}

// Render meeting blocks on the timeline based on meetings array
function renderMeetings(meetings) {
  clearMeetings();

  // Read layout sizes from CSS variables
  const hourWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour-width').trim()) || 120;
  const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10);
  const rowHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--row-height'), 10);

  // Iterate through each meeting to create visual blocks
  meetings.forEach((m, i) => {
    const roomIndex = rooms.indexOf(m.room);
    if (roomIndex === -1) return;  // Skip if meeting room not in rooms list

    let start = timeToDecimalHours(m.datetimein);
    let end = timeToDecimalHours(m.datetimeout);
    if (end <= start) return;       // Skip invalid meetings with zero or negative duration

    // Clamp start and end times within the timeline range
    const clampedStart = Math.max(0, start);
    const clampedEnd = Math.min(totalHours, end);
    const duration = clampedEnd - clampedStart;
    if (duration <= 0) return;

    // Create the meeting block div element
    const meetingDiv = document.createElement('div');
    meetingDiv.classList.add('meeting-block');
    meetingDiv.style.backgroundColor = colors[i % colors.length];  // Cycle colors
    meetingDiv.style.left = (clampedStart * hourWidth) + 'px';     // Position horizontally by start time
    meetingDiv.style.width = (duration * hourWidth) + 'px';        // Width based on duration
    meetingDiv.style.top = headerHeight + (roomIndex * rowHeight) + (0.1 * rowHeight) + 'px'; // Vertical position by room
    meetingDiv.style.height = (rowHeight * 0.8) + 'px';            // Height slightly less than row height

    // Prepare meeting text content (purpose, organizer, participant count, time range)
    const participantCount = m.participants ? m.participants.length : 0;
    const meetingText = `
      <div class="meeting-line">${m.purpose}</div>
      <div class="meeting-line">${m.employee.name} - ผู้เข้าร่วม ${participantCount} คน</div>
      <div class="meeting-line">
        ${new Date(m.datetimein).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} น. -
        ${new Date(m.datetimeout).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} น.
      </div>
    `;

    // Insert content inside nested div structure for styling
    meetingDiv.innerHTML = `
      <div class="meeting-content-wrapper">
        <div class="meeting-content">
          <div class="meeting-set">${meetingText}</div>
          <div class="meeting-set">${meetingText}</div>
        </div>
      </div>
    `;

    // Append meeting block to timeline container
    timeline.appendChild(meetingDiv);
  });
}

// Render grid overlay with lines to guide schedule reading
function renderGridOverlay() {
  // Remove existing overlay if present
  const existingOverlay = document.querySelector('.grid-overlay');
  if (existingOverlay) existingOverlay.remove();

  // Read dimensions from CSS variables
  const hourWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour-width').trim()) || 120;
  const rowHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--row-height'), 10);
  const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10);

  // Create overlay div
  const overlay = document.createElement('div');
  overlay.className = 'grid-overlay';
  overlay.style.width = `${(totalHours + 1) * hourWidth}px`;  // Full timeline width
  overlay.style.height = `${rooms.length * rowHeight}px`;    // Full height covering all rooms
  overlay.style.top = `${headerHeight}px`;                    // Position below timeline header

  // Append overlay to timeline
  timeline.appendChild(overlay);
}

// Dynamically update hour block width based on container size and constraints
function updateHourWidth() {
  const scheduleContainer = document.querySelector('.schedule-container');
  const leftColumn = document.querySelector('.left-column');
  const totalContainerWidth = scheduleContainer.clientWidth;

  // Compute left column width as 20% of container width but constrained between 120-180px
  let leftColumnWidth = Math.max(120, Math.min(180, totalContainerWidth * 0.2));
  leftColumn.style.width = `${leftColumnWidth}px`;

  // Calculate available width for timeline
  const timelineWidth = totalContainerWidth - leftColumnWidth;
  let hourWidthPx = timelineWidth / (totalHours + 1);

  // Minimum hour width from CSS or fallback 80px
  const minHourWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour-min-width')) || 80;
  hourWidthPx = Math.max(hourWidthPx, minHourWidth);

  // Round to integer pixels to avoid subpixel gaps
  hourWidthPx = Math.round(hourWidthPx);

  // Set CSS variable to update layout styles
  document.documentElement.style.setProperty('--hour-width', `${hourWidthPx}px`);

  // Adjust timeline container width accordingly
  if (timeline) {
    timeline.style.width = `${(totalHours + 1) * hourWidthPx}px`;
  }
}

// Initialize Socket.IO client connection
const socket = io();

// Date picker element for selecting schedule date
const datePicker = document.getElementById('datePicker');

// Selected date from server or default to today
const selectedDate = selectedDateFromServer || new Date().toISOString().substring(0, 10);
if (datePicker) datePicker.value = selectedDate;

// Refresh the entire schedule UI (layout + meetings + grid)
function refreshSchedule() {
  updateHourWidth();
  buildTimelineHeader();
  buildRooms();
  renderMeetings(currentMeetings);
  renderGridOverlay();
}

// On socket connect, initialize schedule
socket.on('connect', () => {
  initialize();
});

// Listen for schedule updates from server and refresh UI
socket.on('scheduleUpdate', meetings => {
  currentMeetings = meetings;
  refreshSchedule();
});

// When user changes date, request schedule for that date
if (datePicker) {
  datePicker.addEventListener('change', e => {
    requestSchedule(e.target.value);
  });
}

// Initial load or socket reconnect logic
function initialize() {
  currentMeetings = [];
  refreshSchedule();
  requestSchedule(datePicker ? datePicker.value : new Date().toISOString().substring(0, 10));
}

// Emit request to server for schedule data of given date
function requestSchedule(dateStr) {
  socket.emit('requestSchedule', { date: dateStr });
}

// Refresh schedule layout responsively on window resize
window.addEventListener('resize', () => {
  refreshSchedule();
});
