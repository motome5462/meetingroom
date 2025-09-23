const express = require('express');
const router = express.Router();
const Meeting = require('../models/meetinglist');
const Employee = require('../models/employee');
const { isAuthenticated } = require('../middleware/authMiddleware');
const sendEmail = require('../utils/mailer'); // เพิ่มสำหรับส่งอีเมล

// GET: Render the meeting insert form page
router.get('/', isAuthenticated, (req, res) => {
  res.render('insert', { success: false });
});

// 🔍 Lookup employee name for the main requestor
router.get('/api/employee/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const emp = await Employee.findOne({ employeeid: id });
  if (!emp) return res.status(404).json({});
  res.json({ name: emp.name, department: emp.department });
});

router.get('/api/employees/search', async (req, res) => {
  const q = req.query.q || '';
  let pipeline = [];

  if (!isNaN(q) && q.length >= 3) {
    pipeline = [
      { $addFields: { employeeidStr: { $toString: '$employeeid' } } },
      { $match: { $or: [
        { name: { $regex: q, $options: 'i' } },
        { employeeidStr: { $regex: q } }
      ] } },
      { $limit: 100 }
    ];
  } else {
    pipeline = [
      { $match: { name: { $regex: q, $options: 'i' } } },
      { $limit: 100 }
    ];
  }

  const employees = await Employee.aggregate(pipeline);

  res.json(
    employees.map(e => ({
      id: e.employeeid,
      name: e.name,
      dept: e.department
    }))
  );
});

// POST: Handle meeting reservation submission
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

    if (purpose === 'อื่น ๆ' && customPurpose && customPurpose.trim() !== '') {
      purpose = customPurpose.trim();
    }

    const datetimein = new Date(`${date}T${timein}`);
    const datetimeout = new Date(`${date}T${timeout}`);

    if (datetimein >= datetimeout) {
      return res.status(400).send('⛔ เวลาเริ่มต้นต้องน้อยกว่าหมดเวลา');
    }

    const employee = await Employee.findOne({ employeeid: parseInt(employeeid) });
    if (!employee) {
      return res.status(400).json({ error: '❌ รหัสพนักงานไม่ถูกต้อง' });
    }

    // Normalize participants input
    const rawIds = Array.isArray(participants) ? participants : [participants];
    const participantIds = rawIds
      .filter(id => id && id.trim() !== '')
      .map(id => parseInt(id));

    const participantDocs = await Employee.find({
      employeeid: { $in: participantIds }
    });

    const conflict = await Meeting.findOne({
      room,
      approval: { $ne: 'ยกเลิก' }, // <-- This is the added line
      datetimein: { $lt: datetimeout },
      datetimeout: { $gt: datetimein }
    });

    if (conflict) {
      return res.status(400).json({ error: '❌ ห้องนี้ถูกจองไว้แล้วในช่วงเวลานี้' });
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
      approval: "อนุมัติ"
    });

    await meeting.save();

    // === ส่งอีเมลแจ้งเตือนหลังบันทึก meeting ===
    
    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate('employee', 'name email')
      .populate('participants', 'name email');

    console.log('populatedMeeting.employee:', populatedMeeting.employee);
    console.log('populatedMeeting.participants:', populatedMeeting.participants);

    const recipients = new Set(populatedMeeting.participants.map(p => p.email).filter(Boolean));
    if (populatedMeeting.employee && populatedMeeting.employee.email) recipients.add(populatedMeeting.employee.email);
    const bccList = Array.from(recipients).join(',');

    console.log('BCC (insert):', bccList);

    const subjectToParticipants = `คำเชิญเข้าร่วมประชุม: ${populatedMeeting.purpose}`;
const htmlToParticipants = `
  <p>เรียน ผู้เข้าร่วมประชุม,</p>
  <p>คุณได้รับเชิญให้เข้าร่วมการประชุมเรื่อง "<b>${populatedMeeting.purpose}</b>" โดยคุณ ${populatedMeeting.employee.name}</p>
  <p><b>วันเวลา:</b> ${new Date(populatedMeeting.datetimein).toLocaleDateString('th-TH')} เวลา ${new Date(populatedMeeting.datetimein).toLocaleTimeString('th-TH')} - ${new Date(populatedMeeting.datetimeout).toLocaleTimeString('th-TH')}</p>
  <p><b>ห้อง:</b> ${populatedMeeting.room}</p>
  <p><i>*** การประชุมนี้กำลังรอการอนุมัติจากผู้ดูแลระบบ ***</i></p>
  <hr>
  <p>โปรดตรวจสอบรายละเอียดในระบบ MeetingRoom</p>
`;

    const result = await sendEmail('', subjectToParticipants, htmlToParticipants, bccList);
    console.log('Send result (insert):', result);


    // === จบส่วนส่งอีเมล ===

    // After saving, emit an update event via socket.io to update clients in real-time
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