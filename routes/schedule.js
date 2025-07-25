const express = require('express');
const router = express.Router();
const Meeting = require('../models/meetinglist'); // Mongoose model

// GET / — Daily schedule view
router.get('/', (req, res) => {
  const selectedDate = req.query.date || new Date().toISOString().slice(0, 10);
  if (!req.query.date) {
    res.redirect(`/schedule?date=${selectedDate}`);
  } else {
    res.render('schedule', { selectedDate: selectedDate });
  }
});

// GET /monthly — Monthly calendar view
router.get('/monthly', (req, res) => {
  res.render('monthly', { title: 'Monthly Calendar' });
});

// GET /api/meetings?year=YYYY&month=MM — All meetings in a month
router.get('/api/meetings', async (req, res) => {
  let { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({ error: 'Year and month are required' });
  }

  year = String(year);
  month = String(month).padStart(2, '0');

  const start = new Date(`${year}-${month}-01T00:00:00`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1); // First day of next month

  try {
    const meetings = await Meeting.find({
      datetimein: { $gte: start, $lt: end }
    }).lean();

    const formatted = meetings.map(m => ({
      date: m.datetimein.toISOString().split('T')[0],
      time: m.datetimein.toTimeString().slice(0, 5) + '-' + m.datetimeout.toTimeString().slice(0, 5),
      room: m.room,
      approval: m.approval,
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/schedule?date=YYYY-MM-DD — Daily meeting schedule
router.get('/api/schedule', async (req, res) => {
  const date = req.query.date;

  if (!date) return res.status(400).json({ error: 'Date is required' });

  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59`);

  if (isNaN(start.getTime())) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  try {
    const meetings = await Meeting.find({
      datetimein: { $gte: start, $lte: end }
    })
      .populate('employee', 'name')
      .populate('participants', 'name')
      .lean();

    res.json(meetings);
  } catch (err) {
    console.error('Error fetching schedule:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
