const MeetingList = require('../models/meetinglist');

exports.dashboard = async (req, res) => {
  try {
    const user = req.session.user || req.user;

    const roomOrder = {
      "ห้องประชุม 1": 1,
      "ห้องประชุม 2": 2,
      "ห้องประชุม 3": 3
    };

    const pendingRooms = await MeetingList.find({ approval: 'รออนุมัติ' })
      .populate('employee', 'name')
      .lean();

    const approvedRooms = await MeetingList.find({ approval: 'อนุมัติ' })
      .populate('employee', 'name')
      .lean();

    const getDateString = (d) => {
      const dt = new Date(d);
      return dt.toISOString().slice(0, 10);
    };

    const sortMeetings = (list) =>
      list.sort((a, b) => {
        // 1. Date descending (newest date first)
        const dateA = getDateString(a.datetimein);
        const dateB = getDateString(b.datetimein);
        if (dateA > dateB) return -1;
        if (dateA < dateB) return 1;

        // 2. Room ascending
        const roomA = roomOrder[a.room] || 99;
        const roomB = roomOrder[b.room] || 99;
        if (roomA !== roomB) return roomA - roomB;

        // 3. Time ascending (earliest time first)
        return new Date(a.datetimein) - new Date(b.datetimein);
      });

    sortMeetings(pendingRooms);
    sortMeetings(approvedRooms);

    res.render('admin-dashboard', { user, pendingRooms, approvedRooms });
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

    // Broadcast updated approved meetings via socket.io
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

    // Broadcast updated approved meetings after deletion
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