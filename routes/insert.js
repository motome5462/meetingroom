const express = require('express');
const router = express.Router();
const Meeting = require('../models/meetinglist');
const Employee = require('../models/employee');

// GET: Render the insert form
router.get('/', (req, res) => {
  res.render('insert', { success: false });  // or whatever default
});

// POST: Handle meeting request submission
router.post('/', async (req, res) => {
  try {
    let {
      employeeid,
      date,
      timein,
      timeout,
      room,
      participants = [],
      purpose,
      customPurpose,
      equipment,
      remark
    } = req.body;

    // If user selected "อื่น ๆ" and provided a custom purpose, use that instead
    if (purpose === 'อื่น ๆ' && customPurpose && customPurpose.trim() !== '') {
      purpose = customPurpose.trim();
    }

    // continue with your existing logic...
    const datetimein = new Date(`${date}T${timein}`);
    const datetimeout = new Date(`${date}T${timeout}`);

    if (datetimein >= datetimeout) {
      return res.status(400).send('⛔ เวลาเริ่มต้นต้องน้อยกว่าหมดเวลา');
    }

    const employee = await Employee.findOne({ employeeid: parseInt(employeeid) });
    if (!employee) {
      return res.redirect('/insert?error=employee');
    }

    // Normalize participants to array of valid integers
    const rawIds = Array.isArray(participants) ? participants : [participants];
    const participantIds = rawIds
      .filter(id => id && id.trim() !== '')
      .map(id => parseInt(id));

    const participantDocs = await Employee.find({
      employeeid: { $in: participantIds }
    });

    const conflict = await Meeting.findOne({
      room,
      datetimein: { $lt: datetimeout },
      datetimeout: { $gt: datetimein }
    });

    if (conflict) {
      return res.status(400).send('❌ ห้องนี้ถูกจองไว้แล้วในช่วงเวลานี้');
    }

    const meeting = new Meeting({
      employee: employee._id,
      datetimein,
      datetimeout,
      room,
      participants: participantDocs.map(p => p._id),
      purpose,
      equipment,
      remark,
      approval: "รออนุมัติ"
    });

    await meeting.save();

    const io = req.app.get('io');
    const today = new Date().toISOString().substring(0, 10);
    const todayMeetings = await Meeting.find({
      datetimein: {
        $gte: new Date(`${today}T00:00:00`),
        $lte: new Date(`${today}T23:59:59`)
      }
    })
      .populate('employee', 'name')
      .populate('participants', 'name')
      .lean();

    io.emit('scheduleUpdate', todayMeetings);

    res.redirect('/insert?success=1');

  } catch (err) {
    console.error('❌ Meeting Insert Error:', err);
    res.status(500).send('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
  }
});

module.exports = router;
