const express = require('express');
const router = express.Router();
const Meeting = require('../models/meetinglist'); // Import Meeting model

// GET / — Schedule view page (daily)
router.get('/', (req, res) => {
  const selectedDate = req.query.date || new Date().toISOString().slice(0, 10); // Use date from query or default to today
  res.render('schedule', { title: 'schedule', selectedDate });
});

// GET /monthly — Monthly calendar view page
router.get('/monthly', (req, res) => {
  res.render('monthly'); // Renders monthly.ejs (or .pug etc.) template
});

// GET /api/meetings — API to get all meetings in a given month
router.get('/api/meetings', async (req, res) => {
  let { year, month } = req.query; // Expect year & month from client

  // Validate presence
  if (!year || !month) {
    return res.status(400).json({ error: 'Year and month are required' });
  }

  year = String(year);
  month = String(month).padStart(2, '0'); // Ensure month like '04'

  const start = new Date(`${year}-${month}-01T00:00:00`);
  if (isNaN(start.getTime())) {
    return res.status(400).json({ error: 'Invalid year or month' });
  }

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1); // end = first day of next month

  try {
    // Find meetings starting within that month
    const meetings = await Meeting.find({
      datetimein: { $gte: start, $lt: end }
    }).lean(); // .lean() returns plain JS objects

    // Format: date + time range + room
    const formatted = meetings.map(m => ({
      date: m.datetimein.toISOString().split('T')[0],
      time: m.datetimein.toTimeString().slice(0, 5) + '-' + m.datetimeout.toTimeString().slice(0, 5),
      room: m.room
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ NEW: GET /api/schedule?date=YYYY-MM-DD — API to get daily schedule
router.get('/api/schedule', async (req, res) => {
  const date = req.query.date; // Expect single date string

  if (!date) return res.status(400).json({ error: 'Date is required' });

  const start = new Date(`${date}T00:00:00`);    // Start of day
  const end = new Date(`${date}T23:59:59`);      // End of day

  if (isNaN(start.getTime())) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  try {
    // Find meetings in that day, including related employee & participants
    const meetings = await Meeting.find({
      datetimein: { $gte: start, $lte: end }
    })
    .populate('employee', 'name')          // Include employee name only
    .populate('participants', 'name')      // Include participant names
    .lean();

    res.json(meetings);
  } catch (err) {
    console.error('Error fetching schedule:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export this router to be used in app.js or server.js
module.exports = router;
