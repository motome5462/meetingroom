const express = require('express');
const router = express.Router();
const Meeting = require('../models/meetinglist');
const Employee = require('../models/employee');

// GET: Render the meeting insert form page
router.get('/', (req, res) => {
  // Render 'insert' view with a default success flag set to false
  res.render('insert', { success: false });
});

// 🔍 Lookup employee name for the main requestor
router.get('/api/employee/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const emp = await Employee.findOne({ employeeid: id });
  if (!emp) return res.status(404).json({});
  res.json({ name: emp.name, department: emp.department });
});

// 🔍 Search participants by name or ID
router.get('/api/employees/search', async (req, res) => {
  const q = req.query.q || '';
  const query = isNaN(q)
    ? { name: new RegExp(q, 'i') }
    : { $or: [{ name: new RegExp(q, 'i') }, { employeeid: parseInt(q) }] };

  const employees = await Employee.find(query).limit(10);
  res.json(employees.map(e => ({
    id: e.employeeid,
    name: e.name,
    dept: e.department
  })));
});

// POST: Handle meeting reservation submission
router.post('/', async (req, res) => {
  try {
    // Extract submitted fields from request body
    let {
      employeeid,
      date,
      timein,
      timeout,
      room,
      participants = [],  // default empty array if not provided
      purpose,
      customPurpose,
      equipment,
      remark
    } = req.body;

    // If user selected "อื่น ๆ" (Other) as purpose and provided a customPurpose,
    // use the trimmed customPurpose value instead of the default
    if (purpose === 'อื่น ๆ' && customPurpose && customPurpose.trim() !== '') {
      purpose = customPurpose.trim();
    }

    // Construct full Date objects for start and end datetime of the meeting
    const datetimein = new Date(`${date}T${timein}`);
    const datetimeout = new Date(`${date}T${timeout}`);

    // Validate that start time is before end time
    if (datetimein >= datetimeout) {
      return res.status(400).send('⛔ เวลาเริ่มต้นต้องน้อยกว่าหมดเวลา');  // "Start time must be before end time"
    }

    // Find employee who is requesting the meeting by their employeeid
    const employee = await Employee.findOne({ employeeid: parseInt(employeeid) });
    if (!employee) {
      // Redirect back with error if employee not found
        return res.status(400).json({ error: '❌ รหัสพนักงานไม่ถูกต้อง' });
    }

    // Normalize participants input: ensure it's an array of valid employee IDs (integers)
    const rawIds = Array.isArray(participants) ? participants : [participants];
    const participantIds = rawIds
      .filter(id => id && id.trim() !== '')  // remove empty or blank entries
      .map(id => parseInt(id));

    // Query participant employees by their IDs to get their documents
    const participantDocs = await Employee.find({
      employeeid: { $in: participantIds }
    });

    // Check for time conflicts with existing meetings in the same room
    // Conflict means any existing meeting where start time < new end time
    // AND end time > new start time
    const conflict = await Meeting.findOne({
      room,
      datetimein: { $lt: datetimeout },
      datetimeout: { $gt: datetimein }
    });

    if (conflict) {
      // If conflict found, reject the request with an error message
      return res.status(400).json({ error: '❌ ห้องนี้ถูกจองไว้แล้วในช่วงเวลานี้' });  // "Room is already booked at this time"
    }

    // Create a new Meeting document with provided details
    const meeting = new Meeting({
      employee: employee._id,
      datetimein,
      datetimeout,
      room,
      participants: participantDocs.map(p => p._id),
      purpose,
      equipment,
      remark,
      approval: "รออนุมัติ" // ตั้งค่านี้เสมอ เพื่อรอ admin อนุมัติ
    });

    // Save the new meeting record in the database
    await meeting.save();

    // After saving, emit an update event via socket.io to update clients in real-time
    const io = req.app.get('io');
    const today = new Date().toISOString().substring(0, 10);  // Current date in 'YYYY-MM-DD'
    
    // Fetch all meetings for today, including employee and participants' names
    const todayMeetings = await Meeting.find({
      datetimein: {
        $gte: new Date(`${today}T00:00:00`),
        $lte: new Date(`${today}T23:59:59`)
      }
    })
      .populate('employee', 'name')       // populate employee's name
      .populate('participants', 'name')   // populate participants' names
      .lean();

    // Broadcast updated meeting schedule to all connected clients
    io.emit('scheduleUpdate', todayMeetings);

    // Redirect back to the insert form page with a success query flag
    res.redirect('/insert?success=1');

  } catch (err) {
    // Log error for debugging and respond with 500 status and error message
    console.error('❌ Meeting Insert Error:', err);
    res.status(500).send('เกิดข้อผิดพลาดในการบันทึกข้อมูล');  // "An error occurred while saving data"
  }
});

module.exports = router;
