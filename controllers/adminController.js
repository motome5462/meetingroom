const MeetingList = require('../models/meetinglist');
const Employee = require('../models/employee');


exports.dashboard = async (req, res) => {
  try {
    const user = req.session.user || req.user;

    const pendingPage = parseInt(req.query.pendingPage) || 1;
    const approvedPage = parseInt(req.query.approvedPage) || 1;
    const pageSize = 4;

    const selectedDate = req.query.date || null;

    // Date filter only for approved rooms
    let approvedDateFilter = {};
    if (selectedDate) {
      const start = new Date(selectedDate + 'T00:00:00');
      const end = new Date(selectedDate + 'T23:59:59');
      approvedDateFilter = { datetimein: { $gte: start, $lte: end } };
    }

    // Pending count and rooms WITHOUT date filter
    const pendingCount = await MeetingList.countDocuments({ approval: 'รออนุมัติ' });
    const pendingRooms = await MeetingList.find({ approval: 'รออนุมัติ' })
      .populate('employee', 'name')
      .sort({ datetimein: -1 })
      .skip((pendingPage - 1) * pageSize)
      .limit(pageSize)
      .lean();

    // Approved count and rooms WITH date filter
    const approvedCount = await MeetingList.countDocuments({ approval: 'อนุมัติ', ...approvedDateFilter });
    const approvedRooms = await MeetingList.find({ approval: 'อนุมัติ', ...approvedDateFilter })
      .populate('employee', 'name')
      .sort({ datetimein: -1 })
      .skip((approvedPage - 1) * pageSize)
      .limit(pageSize)
      .lean();

    res.render('admin-dashboard', {
      user,
      pendingRooms,
      approvedRooms,
      pendingPage,
      approvedPage,
      pendingTotalPages: Math.ceil(pendingCount / pageSize),
      approvedTotalPages: Math.ceil(approvedCount / pageSize),
      selectedDate,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Server error');
  }
};


exports.approveRoom = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'Missing meeting ID' });

    await MeetingList.findByIdAndUpdate(id, { approval: 'อนุมัติ' });

    const io = req.app.get('io');
    if (io) {
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

    res.json({ success: true });
  } catch (error) {
    console.error('Approve room error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.rejectRoom = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'Missing meeting ID' });

    const deletedMeeting = await MeetingList.findByIdAndDelete(id);
    if (!deletedMeeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found or already deleted' });
    }

    const io = req.app.get('io');
    if (io) {
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

    res.json({ success: true });
  } catch (error) {
    console.error('Reject room error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteMeeting = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'Missing meeting ID' });

    const deleted = await MeetingList.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Meeting not found' });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getEditMeeting = async (req, res) => {
  try {
    const meeting = await MeetingList.findById(req.params.id)
      .populate('participants', 'name employeeid')
      .lean();

    if (!meeting) return res.status(404).send('ไม่พบรายการประชุม');

    res.render('edit-meeting', { meeting });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

exports.postEditMeeting = async (req, res) => {
  try {
    const { room, date, timein, timeout, purpose, customPurpose, equipment, remark, participants } = req.body;

    const datetimein = new Date(`${date}T${timein}`);
    const datetimeout = new Date(`${date}T${timeout}`);
    const finalPurpose = (purpose === 'อื่น ๆ' && customPurpose) ? customPurpose : purpose;

    let participantIds = [];
    if (participants) {
      const ids = Array.isArray(participants) ? participants : [participants];
      const foundEmployees = await Employee.find({ employeeid: { $in: ids.map(Number) } }, '_id');
      participantIds = foundEmployees.map(emp => emp._id);
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

    res.redirect('/admin/admindashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};
