const MeetingList = require('../models/meetinglist');

exports.dashboard = async (req, res) => {
    const user = req.session.user || req.user;
    // ดึงห้องประชุมที่ approval: 'รออนุมัติ' และ populate ข้อมูล employee
    const pendingRooms = await MeetingList.find({ approval: 'รออนุมัติ' })
        .populate('employee', 'name') // ดึงเฉพาะ field name จาก employee
        .lean();
    res.render('admin-dashboard', { user, pendingRooms });
};

exports.approveRoom = async (req, res) => {
    await MeetingList.findByIdAndUpdate(req.body.id, { approval: 'อนุมัติ' });

    // อัปเดตข้อมูลและ broadcast ไปยัง client ทุกคน (เช่น display)
    const io = req.app.get('io');
    if (io) {
        // ส่งเฉพาะ meeting ที่ approval === 'อนุมัติ'
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
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
};

exports.rejectRoom = async (req, res) => {
    await MeetingList.findByIdAndUpdate(req.body.id, { approval: 'ไม่อนุมัติ' });
    res.json({ success: true });
};

