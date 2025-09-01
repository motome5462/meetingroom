const MeetingList = require('../models/meetinglist');
const Employee = require('../models/employee');

// 📌 Helper: broadcast today's approved meetings
async function broadcastTodaySchedule(io) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  const meetings = await MeetingList.find({
    datetimein: { $gte: start, $lte: end },
    approval: 'อนุมัติ'
  })
    .populate('employee', 'name')
    .populate('participants', 'name')
    .lean();

  io.emit('scheduleUpdate', meetings);
}

// 📌 Helper: broadcast current month's approved meetings summary
async function broadcastMonthlyUpdate(io) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const meetings = await MeetingList.find({
    datetimein: { $gte: start, $lt: end },
    approval: 'อนุมัติ'
  }).lean();

  const summary = meetings.map(m => ({
    date: m.datetimein.toISOString().split('T')[0],
    time: `${m.datetimein.toTimeString().slice(0, 5)}-${m.datetimeout.toTimeString().slice(0, 5)}`,
    room: m.room,
    approval: m.approval,
  }));

  // ✅ Emit using consistent event name expected by monthly.js
  io.emit('meetingsUpdated', { year, month, meetings: summary });
}

// 🧩 Admin Dashboard
exports.dashboard = async (req, res) => {
  try {
    const user = req.session.user || req.user;
    const approvedPage = parseInt(req.query.approvedPage) || 1;
    const pageSize = 4;
    const selectedDate = req.query.date || null;

    let approvedDateFilter = {};
    if (selectedDate) {
      const start = new Date(`${selectedDate}T00:00:00`);
      const end = new Date(`${selectedDate}T23:59:59`);
      approvedDateFilter.datetimein = { $gte: start, $lte: end };
    }

    const approvedCount = await MeetingList.countDocuments({ approval: 'อนุมัติ', ...approvedDateFilter });

    const approvedRoomsUnsorted = await MeetingList.find({ approval: 'อนุมัติ', ...approvedDateFilter })
        .populate('employee', 'name')
        .populate('participants', 'name')
        .lean();

    // 🧠 Sorting logic: date DESC > room custom order > time ASC
    const roomOrder = ['ห้องประชุม 1', 'ห้องประชุม 2', 'ห้องประชุม 3'];
    const sortMeetings = (meetings) => {
      return meetings.sort((a, b) => {
        const dateA = a.datetimein.toISOString().split('T')[0];
        const dateB = b.datetimein.toISOString().split('T')[0];
        const dateCompare = dateB.localeCompare(dateA); // DESC by date
        if (dateCompare !== 0) return dateCompare;

        const roomA = roomOrder.indexOf(a.room);
        const roomB = roomOrder.indexOf(b.room);
        if (roomA !== roomB) return roomA - roomB;

        return new Date(a.datetimein) - new Date(b.datetimein); // ASC time
      });
    };

    const approvedRoomsSorted = sortMeetings(approvedRoomsUnsorted);

    const approvedRooms = approvedRoomsSorted.slice((approvedPage - 1) * pageSize, approvedPage * pageSize);

    res.render('admin-dashboard', {
      user,
      approvedRooms,
      approvedPage,
      approvedTotalPages: Math.ceil(approvedCount / pageSize),
      selectedDate
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).send('Server error');
  }
};

// 🗑️ Delete Meeting (no approval check)
exports.deleteMeeting = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'Missing meeting ID' });

    const deleted = await MeetingList.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Meeting not found' });

    const io = req.app.get('io');
    if (io) {
      await broadcastTodaySchedule(io);
      await broadcastMonthlyUpdate(io);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete meeting error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 📝 Get Edit Form
exports.getEditMeeting = async (req, res) => {
  try {
const meeting = await MeetingList.findById(req.params.id)
  .populate('employee', 'name employeeid') // 🆕 requester
  .populate('participants', 'name employeeid')
  .lean();

    if (!meeting) return res.status(404).send('ไม่พบรายการประชุม');

    res.render('edit-meeting', { meeting });
  } catch (err) {
    console.error('Edit form error:', err);
    res.status(500).send('Server error');
  }
};

// 📝 Submit Edited Meeting
exports.postEditMeeting = async (req, res) => {
  try {
    const { room, date, timein, timeout, purpose, customPurpose, equipment, remark, participants } = req.body;

    const datetimein = new Date(`${date}T${timein}`);
    const datetimeout = new Date(`${date}T${timeout}`);
    if (datetimeout <= datetimein) {
      return res.status(400).send('เวลาสิ้นสุดต้องมากกว่่าเวลาเริ่มต้น');
    }

    const finalPurpose = (purpose === 'อื่น ๆ' && customPurpose) ? customPurpose : purpose;

    let participantIds = [];
    if (participants) {
      const ids = Array.isArray(participants) ? participants : [participants];
      const found = await Employee.find({ employeeid: { $in: ids.map(Number) } }, '_id');
      participantIds = found.map(emp => emp._id);
    }

    await MeetingList.findByIdAndUpdate(req.params.id, {
      room,
      datetimein,
      datetimeout,
      purpose: finalPurpose,
      equipment,
      remark,
      participants: participantIds,
    });

    const io = req.app.get('io');
    if (io) {
      await broadcastTodaySchedule(io);
      await broadcastMonthlyUpdate(io);
    }

    res.redirect('/admin/admindashboard');
  } catch (err) {
    console.error('Post edit error:', err);
    res.status(500).send('Server error');
  }
};