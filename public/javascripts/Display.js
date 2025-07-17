// List of meeting rooms - can be modified to add/remove rooms
const rooms = ['ห้องประชุม 1', 'ห้องประชุม 2', 'ห้องประชุม 3'];
const startHour = 8;    // Schedule start hour (8 AM)
const endHour = 18;     // Schedule end hour (6 PM)
const totalHours = endHour - startHour;  // Total hours displayed

// DOM elements for timeline and room list columns
const timeline = document.getElementById('timeline');
const roomsCol = document.getElementById('roomsCol');

// Array of colors for meeting blocks, will cycle through these
const colors = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6'];

// Store current meetings data (array of meeting objects)
let currentMeetings = [];

// Utility function to remove all child elements of a given element
function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

// Build and display the list of meeting rooms on the left column
function buildRooms() {
  clearChildren(roomsCol); // Remove old room elements
  rooms.forEach(room => {
    const div = document.createElement('div');
    div.classList.add('room');
    div.textContent = room; // Show room name
    roomsCol.appendChild(div);
  });
}

// Build the timeline header showing each hour label at top
function buildTimelineHeader() {
  clearChildren(timeline); // Remove old hour labels

  // Get CSS variable for hour block width (fallback 80px)
  const hourWidth = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--hour-width').trim()
  ) || 80;

  // Create a label for each hour from startHour to endHour
  for (let h = startHour; h <= endHour; h++) {
    const label = document.createElement('div');
    label.classList.add('time-label');
    label.style.width = hourWidth + 'px';
    label.textContent = `${h}:00`;
    timeline.appendChild(label);
  }
  // Set timeline container width to fit all hour labels
  timeline.style.width = ((totalHours + 1) * hourWidth) + 'px';
}

// Convert a datetime string to decimal hours offset from startHour
// e.g. 10:30 → 2.5 (if startHour=8)
function timeToDecimalHours(timeStr) {
  const dt = new Date(timeStr);
  return dt.getHours() + dt.getMinutes() / 60 - startHour;
}

// Remove all meeting block elements from timeline
function clearMeetings() {
  document.querySelectorAll('.meeting-block').forEach(mb => mb.remove());
}

// Render meeting blocks on the timeline based on meeting data array
function renderMeetings(meetings) {
  clearMeetings();

  // Read CSS variables for layout sizes
  const hourWidth = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--hour-width').trim()
  ) || 80;

  const headerHeight = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--header-height'),
    10
  );

  const rowHeight = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--row-height'),
    10
  );

  // Iterate over meetings and create a visual block for each
  meetings.forEach((m, i) => {
    // ตรวจสอบสถานะ (approval) ก่อนแสดงผล
    if (m.approval && m.approval !== 'อนุมัติ') return;

    const roomIndex = rooms.indexOf(m.room);
    if (roomIndex === -1) return;

    let start = timeToDecimalHours(m.datetimein);
    let end = timeToDecimalHours(m.datetimeout);

    if (end <= start) return;  // Invalid meeting duration

    // Clamp start and end times to timeline range
    const clampedStart = Math.max(0, start);
    const clampedEnd = Math.min(totalHours, end);
    const duration = clampedEnd - clampedStart;

    if (duration <= 0) return;

    // Create the meeting block element
    const meetingDiv = document.createElement('div');
    meetingDiv.classList.add('meeting-block');

    // Cycle colors for visual differentiation
    meetingDiv.style.backgroundColor = colors[i % colors.length];

    // Position block horizontally based on start time and width based on duration
    meetingDiv.style.left = clampedStart * hourWidth + 'px';
    meetingDiv.style.width = duration * hourWidth + 'px';

    // Position block vertically based on room index and row height
    meetingDiv.style.top = headerHeight + roomIndex * rowHeight + 0.1 * rowHeight + 'px';
    meetingDiv.style.height = rowHeight * 0.8 + 'px'; // Slightly smaller than row height for padding

    // Prepare the meeting text info
    const participantCount = m.participants ? m.participants.length : 0;
    const meetingText = `
      <div class="meeting-line">${m.purpose}</div>
      <div class="meeting-line">${m.employee.name} - ผู้เข้าร่วม ${participantCount} คน</div>
      <div class="meeting-line">
        ${new Date(m.datetimein).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} น. -
        ${new Date(m.datetimeout).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} น.
      </div>
    `;

    // Insert basic content first (only one set)
    meetingDiv.innerHTML = `
      <div class="meeting-content-wrapper">
        <div class="meeting-content">
          <div class="meeting-set">${meetingText}</div>
        </div>
      </div>
    `;

    // Append to timeline
    timeline.appendChild(meetingDiv);

    // Check for overflow and add animation and second set if needed
    requestAnimationFrame(() => {
      const contentWrapper = meetingDiv.querySelector('.meeting-content-wrapper');
      const content = meetingDiv.querySelector('.meeting-content');
      const contentSet = content.querySelector('.meeting-set');

      if (content.scrollWidth > contentWrapper.clientWidth) {
        content.classList.add('marquee');

        // Clone and append second set only if scrolling is needed
        const clone = contentSet.cloneNode(true);
        content.appendChild(clone);
      } else {
        content.classList.remove('marquee');
      }
    });
  });
}

// Create a grid overlay (lines) on the timeline for visual guidance
function renderGridOverlay() {
  const existingOverlay = document.querySelector('.grid-overlay');
  if (existingOverlay) existingOverlay.remove();  // Remove old overlay if exists

  // Get sizes from CSS variables
  const hourWidth = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--hour-width').trim()
  ) || 80;

  const rowHeight = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--row-height'),
    10
  );

  const headerHeight = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--header-height'),
    10
  );

  // Create new overlay element
  const overlay = document.createElement('div');
  overlay.className = 'grid-overlay';

  // Set overlay size to cover the full timeline and all rooms vertically
  overlay.style.width = (totalHours + 1) * hourWidth + 'px';
  overlay.style.height = rooms.length * rowHeight + 'px';
  overlay.style.top = headerHeight + 'px';

  timeline.appendChild(overlay);
}

// Adjust the CSS variable for hour block width dynamically based on container size
function updateHourWidth() {
  const scheduleContainer = document.querySelector('.schedule-container');
  const leftColumn = document.querySelector('.left-column');
  const totalContainerWidth = scheduleContainer.clientWidth;

  let leftColumnWidth = leftColumn.clientWidth || 140;  // Fallback width

  const timelineWidth = totalContainerWidth - leftColumnWidth;

  // Calculate hour width to fit timeline within available space
  let hourWidthPx = timelineWidth / (totalHours + 1);

  // Minimum hour width from CSS variable or fallback 60px
  const minHourWidth =
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour-min-width')) || 60;

  // Enforce minimum width and round down
  hourWidthPx = Math.max(hourWidthPx, minHourWidth);
  hourWidthPx = Math.floor(hourWidthPx);

  // Update CSS variable for hour width to trigger layout changes
  document.documentElement.style.setProperty('--hour-width', `${hourWidthPx}px`);

  // Update timeline container width accordingly
  if (timeline) {
    timeline.style.width = (totalHours + 1) * hourWidthPx + 'px';
  }
}

// Socket.IO client connection to listen for schedule updates
const socket = io();

// Date picker DOM element for selecting schedule date
const datePicker = document.getElementById('datePicker');

// Initialize date picker to today's date if exists
const todayStr = new Date().toISOString().substring(0, 10);
if (datePicker) datePicker.value = todayStr;

// Refresh the entire schedule UI: update sizes, build headers, rooms, meetings, and overlay
function refreshSchedule() {
  updateHourWidth();
  buildTimelineHeader();
  buildRooms();
  renderMeetings(currentMeetings);
  renderGridOverlay();
  updateScheduleWrapperHeight();
}

// Adjust the height of schedule wrapper container based on number of rooms
function updateScheduleWrapperHeight() {
  const rowHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--row-height'), 10);
  const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10);
  const scheduleWrapper = document.querySelector('.schedule-wrapper');
  scheduleWrapper.style.height = `${headerHeight + rowHeight * rooms.length}px`;
}

// Handle socket connection established event
socket.on('connect', () => {
  initialize();
});

// Listen for schedule updates sent by server and refresh display
socket.on('scheduleUpdate', meetings => {
  currentMeetings = meetings;
  refreshSchedule();
});

// When the date picker value changes, request the schedule for that date
if (datePicker) {
  datePicker.addEventListener('change', e => {
    requestSchedule(e.target.value);
  });
}

// Initialize schedule on page load or socket reconnect
function initialize() {
  currentMeetings = [];
  refreshSchedule();
  requestSchedule(datePicker ? datePicker.value : todayStr);
}

// Emit request to server for schedule data of a specific date
function requestSchedule(dateStr) {
  socket.emit('requestSchedule', { date: dateStr });
}

// Rebuild the schedule UI responsively when the window resizes
window.addEventListener('resize', () => {
  refreshSchedule();
});
