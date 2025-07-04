const express = require('express');
const router = express.Router();
const Meeting = require('../models/meetinglist');
const Employee = require('../models/employee');

router.get('/', (req, res) => {
  const success = req.query.success === '1';
  res.render('insert', { success });
});

router.post('/', async (req, res) => {
  try {
    const {
      employeeid,
      date,
      timein,
      timeout,
      room,
      participants = [],
      purpose,
      equipment,
      remark
    } = req.body;

    const datetimein = new Date(`${date}T${timein}`);
    const datetimeout = new Date(`${date}T${timeout}`);

    if (datetimein >= datetimeout) {
      return res.status(400).send('เวลาเริ่มต้นต้องน้อยกว่าหมดเวลา');
    }

    // Find the requesting employee
    const employee = await Employee.findOne({ employeeid: parseInt(employeeid) });
    if (!employee) {
      return res.status(400).send('ไม่พบพนักงานหลัก');
    }

    // Find participant employees by their IDs
    const participantIds = Array.isArray(participants) ? participants : [participants];
    const participantDocs = await Employee.find({
      employeeid: { $in: participantIds.map(id => parseInt(id)) }
    });

    // Check for room conflict
    const conflict = await Meeting.findOne({
      room,
      datetimein: { $lt: datetimeout },
      datetimeout: { $gt: datetimein }
    });

    if (conflict) {
      return res.status(400).send('❌ ห้องนี้ถูกจองไว้แล้วในช่วงเวลานี้');
    }

    // Save new meeting
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

    // Emit real-time schedule update
    const io = req.app.get('io');
    const today = new Date().toISOString().substring(0, 10);
    const todayMeetings = await Meeting.find({
      datetimein: {
        $gte: new Date(`${today}T00:00:00`),
        $lte: new Date(`${today}T23:59:59`)
      }
    }).populate('employee').populate('participants').lean();

    io.emit('scheduleUpdate', todayMeetings);

    res.redirect('/insert?success=1');

  } catch (err) {
    console.error(err);
    res.status(500).send('เกิดข้อผิดพลาด');
  }
});

module.exports = router;
