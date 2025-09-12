const MeetingList = require('../models/meetinglist');
const Employee = require('../models/employee');

// 🧩 User Dashboard (เวอร์ชันแก้ไขล่าสุด)
exports.dashboard = async (req, res) => {
  try {
    const user = req.session.user;
    const { room: roomFilter, date: dateFilter } = req.query;

    const employee = await Employee.findOne({ employeeid: user.username });
    if (!employee) {
      return res.status(404).send('Employee not found');
    }

    // 1. ดึงข้อมูลการประชุมทั้งหมดของ user คนนี้มาก่อน
    const allMeetings = await MeetingList.find({ employee: employee._id })
      .populate('participants', 'name')
      .lean();

    let filteredMeetings = allMeetings;

    // --- ปรับ logic: กรองห้องหรือวันที่ อย่างใดอย่างหนึ่งหรือทั้งสองอย่างก็ได้ ---
    if (roomFilter && roomFilter.trim() !== "") {
      filteredMeetings = filteredMeetings.filter(meeting => meeting.room.trim() === roomFilter.trim());
    }
    if (dateFilter && dateFilter.trim() !== "") {
      filteredMeetings = filteredMeetings.filter(m => {
        const meetingDate = new Date(m.datetimein).toISOString().split('T')[0];
        return meetingDate === dateFilter;
      });
    }

    // ฟังก์ชันสำหรับดึงหมายเลขห้อง
    const getRoomNumber = (roomName) => {
      if (typeof roomName !== 'string') return 0;
      const match = roomName.trim().match(/\d+$/);
      return match ? parseInt(match[0], 10) : 0;
    };

    // 2. เรียงลำดับผลลัพธ์
    const sortedMeetings = [...filteredMeetings].sort((a, b) => {
      const dateA = new Date(a.datetimein);
      const dateB = new Date(b.datetimein);

      const dayA = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
      const dayB = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());

      if (dayB - dayA !== 0) {
        return dayB - dayA;
      }

      const roomNumberA = getRoomNumber(a.room);
      const roomNumberB = getRoomNumber(b.room);
      if (roomNumberA !== roomNumberB) {
        return roomNumberA - roomNumberB;
      }

      return dateA - dateB;
    });

    // 3. ส่งข้อมูลที่เรียงลำดับแล้วไปแสดงผล
    res.render('user-dashboard', {
      user,
      employeeName: employee.name,
      meetings: sortedMeetings,
      roomFilter,
      dateFilter
    });

  } catch (err) {
    console.error('User dashboard error:', err);
    res.status(500).send('Server error');
  }
};
// ... (ส่วนที่เหลือของ controller เหมือนเดิม)

// 🗑️ Delete Meeting
exports.deleteMeeting = async (req, res) => {
    try {
      const { id } = req.body;
      const user = req.session.user;

      const employee = await Employee.findOne({ employeeid: user.username });
      if (!employee) {
        return res.status(403).json({ success: false, message: 'User not found.' });
      }

      const meeting = await MeetingList.findById(id);

      if (!meeting) {
        return res.status(404).json({ success: false, message: 'Meeting not found.' });
      }

      // Ensure the user owns this meeting
      if (meeting.employee.toString() !== employee._id.toString()) {
        return res.status(403).json({ success: false, message: 'Permission denied.' });
      }

      await MeetingList.findByIdAndDelete(id);

      const io = req.app.get('io');
      if (io) {
        // Broadcast updates to all clients
        // You might want to create a helper for this to avoid code duplication
        const today = new Date().toISOString().substring(0, 10);
        const todayMeetings = await MeetingList.find({
          datetimein: {
            $gte: new Date(`${today}T00:00:00`),
            $lte: new Date(`${today}T23:59:59`)
          },
          approval: { $ne: 'ยกเลิก' }
        })
        .populate('employee', 'name')
        .populate('participants', 'name')
        .lean();
        io.emit('scheduleUpdate', todayMeetings);
      }

      res.json({ success: true });
    } catch (err) {
      console.error('Delete meeting error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  };

// 🛑 Cancel Meeting
exports.cancelMeeting = async (req, res) => {
  try {
    const { id } = req.body;
    const user = req.session.user;

    const employee = await Employee.findOne({ employeeid: user.username });
    if (!employee) {
      return res.status(403).json({ success: false, message: 'User not found.' });
    }

    const meeting = await MeetingList.findById(id);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found.' });
    }

    // Ensure the user owns this meeting
    if (meeting.employee.toString() !== employee._id.toString()) {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }

    meeting.approval = 'ยกเลิก';
    await meeting.save();

    const io = req.app.get('io');
    if (io) {
      // Broadcast updates to all clients
      const today = new Date().toISOString().substring(0, 10);
      const todayMeetings = await MeetingList.find({
        datetimein: {
          $gte: new Date(`${today}T00:00:00`),
          $lte: new Date(`${today}T23:59:59`)
        },
        approval: { $ne: 'ยกเลิก' }
      })
      .populate('employee', 'name')
      .populate('participants', 'name')
      .lean();
      io.emit('scheduleUpdate', todayMeetings);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Cancel meeting error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
// ✏️ Show Edit Meeting Page
exports.editMeetingPage = async (req, res) => {
  try {
    const meeting = await MeetingList.findById(req.params.id).populate('participants');
    if (!meeting) {
      return res.status(404).send('Meeting not found');
    }

    // Ensure the user owns this meeting
    const user = req.session.user;
    const employee = await Employee.findOne({ employeeid: user.username });
    if (!employee || meeting.employee.toString() !== employee._id.toString()) {
      return res.status(403).send('Permission denied.');
    }
    const employees = await Employee.find({});
    res.render('edit-meeting', { meeting, employees, user: req.session.user });
  } catch (err) {
    console.error('Edit meeting page error:', err);
    res.status(500).send('Server error');
  }
};

// 🔄 Update Meeting
exports.updateMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      datetimein,
      datetimeout,
      room,
      purpose,
      participants,
      equipment,
      remark,
    } = req.body;

    const meeting = await MeetingList.findById(id);

    if (!meeting) {
      return res.status(404).send('Meeting not found');
    }

    // Ensure the user owns this meeting
    const user = req.session.user;
    const employee = await Employee.findOne({ employeeid: user.username });
    if (!employee || meeting.employee.toString() !== employee._id.toString()) {
      return res.status(403).send('Permission denied.');
    }

    await MeetingList.findByIdAndUpdate(id, {
      datetimein,
      datetimeout,
      room,
      purpose,
      participants,
      equipment,
      remark,
    });

    res.redirect('/user/dashboard');
  } catch (err) {
    console.error('Update meeting error:', err);
    res.status(500).send('Server error');
  }
};