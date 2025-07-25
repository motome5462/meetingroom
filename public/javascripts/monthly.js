document.addEventListener('DOMContentLoaded', () => {
  // Reference to the calendar grid container div where day cells will be inserted
  const calendarGrid = document.getElementById('calendarGrid');

  // Reference to the month input control for selecting which month to display
  const monthPicker = document.getElementById('monthPicker');

  // Socket.io client to listen for live updates of meetings
  const socket = io();

  // Array to hold meeting data for the selected month
  let meetingData = [];

  // Get current year and month to initialize calendar and month picker
  const now = new Date();
  let currentYear = now.getFullYear();
  let currentMonth = now.getMonth() + 1; // JS months are zero-based

  // Set month picker to current month in YYYY-MM format
  monthPicker.value = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  /**
   * Fetch meetings for given year and month from backend API
   * @param {number} year - The year to fetch meetings for
   * @param {number} month - The month (1-12) to fetch meetings for
   */
  async function loadMeetings(year, month) {
    try {
      const res = await fetch(`/schedule/api/meetings?year=${year}&month=${month}`);
      if (!res.ok) throw new Error('Failed to load meetings');

      // Update local meeting data
      meetingData = await res.json();

      // Regenerate calendar with new data
      generateCalendar(year, month);
    } catch (err) {
      console.error('Error fetching meetings:', err);
    }
  }

  /**
   * Generate the calendar grid for the specified year and month
   * @param {number} year - Year of the calendar
   * @param {number} month - Month (1-12)
   */
  function generateCalendar(year, month) {
    // Get first and last days of the month
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const totalDays = lastDay.getDate();

    // Calculate the weekday of the first day, adjusted to Monday as day 0
    // JS getDay(): Sunday=0 ... Saturday=6, so shift Sunday to 6 and Monday to 0
    const firstWeekDay = (firstDay.getDay() + 6) % 7;

    // Today's date string in 'YYYY-MM-DD' format for highlighting
    const todayStr = new Date().toISOString().slice(0, 10);

    // Clear previously rendered day cells but keep weekday headers (first 7 children)
    while (calendarGrid.children.length > 7) {
      calendarGrid.removeChild(calendarGrid.lastChild);
    }

    // Add empty cells for days before the first day of the month to align Monday start
    for (let i = 0; i < firstWeekDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'day-cell empty';
      calendarGrid.appendChild(emptyCell);
    }

    const maxMeetingsToShow = 3; // Limit number of meetings displayed per day

    // Create day cells for each day in the month
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;

      // Filter meetings for this date AND approval is "อนุมัติ"
      const dayMeetings = meetingData.filter(m => m.date === dateStr && m.approval === "อนุมัติ");

      // Create the day cell div
      const dayCell = document.createElement('div');
      dayCell.className = 'day-cell' + (isToday ? ' today' : '');
      dayCell.tabIndex = 0; // Make focusable for accessibility
      dayCell.setAttribute('role', 'button');
      dayCell.setAttribute('aria-label', `วันที่ ${d} มี ${dayMeetings.length} การประชุม`);

      // Click or keyboard "Enter" / "Space" navigates to schedule page with that date
      dayCell.addEventListener('click', () => location.href = `/schedule?date=${dateStr}`);
      dayCell.addEventListener('keypress', e => {
        if (e.key === 'Enter' || e.key === ' ') location.href = `/schedule?date=${dateStr}`;
      });

      // Date label (number) displayed on top center of cell
      const dateLabel = document.createElement('div');
      dateLabel.className = 'date-label';
      dateLabel.textContent = d;

      // Container for showing meeting summaries inside day cell
      const meetingList = document.createElement('div');
      meetingList.className = 'meeting-list';

      // Show up to maxMeetingsToShow meetings as entries
      dayMeetings.slice(0, maxMeetingsToShow).forEach(m => {
        const meetingEntry = document.createElement('div');
        meetingEntry.className = 'meeting-entry';
        meetingEntry.innerHTML = `${m.room}<br><span>${m.time}</span>`;
        meetingList.appendChild(meetingEntry);
      });

      // If there are more meetings, show a "+ more" indicator
      if (dayMeetings.length > maxMeetingsToShow) {
        const moreEntry = document.createElement('div');
        moreEntry.className = 'meeting-entry more';
        moreEntry.textContent = `... ${dayMeetings.length - maxMeetingsToShow} เพิ่มเติม`;
        meetingList.appendChild(moreEntry);
      }

      // Append date label and meetings to day cell
      dayCell.appendChild(dateLabel);
      dayCell.appendChild(meetingList);

      // Append day cell to calendar grid
      calendarGrid.appendChild(dayCell);
    }
  }

  // When month picker changes, reload meetings for selected month
  monthPicker.addEventListener('change', e => {
    const [year, month] = e.target.value.split('-').map(Number);
    currentYear = year;
    currentMonth = month;
    loadMeetings(year, month);
  });

  // Listen for live updates from server via socket.io
  // Update calendar if updated meetings are for current displayed month
  socket.on('meetingsUpdated', ({ year, month, meetings }) => {
    if (year === currentYear && month === currentMonth) {
      meetingData = meetings;
      generateCalendar(year, month);
    }
  });

  // Initial load on page ready
  loadMeetings(currentYear, currentMonth);
});
