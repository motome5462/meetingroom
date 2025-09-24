const MeetingList = require('../models/meetinglist');
const Employee = require('../models/employee');
const sendEmail = require('../utils/mailer');

// 🧩 User Dashboard
exports.dashboard = async (req, res) => {
  try {
    const user = req.session.user;
    const { room: roomFilter, date: dateFilter } = req.query;

    const employee = await Employee.findOne({ employeeid: user.username });
    if (!employee) {
      return res.status(404).send('Employee not found');
    }

    const allMeetings = await MeetingList.find({ employee: employee._id })
      .populate('participants', 'name')
      .lean();

    let filteredMeetings = allMeetings;

    if (roomFilter && roomFilter.trim() !== '') {
      filteredMeetings = filteredMeetings.filter(meeting => meeting.room.trim() === roomFilter.trim());
    }
    if (dateFilter && dateFilter.trim() !== '') {
      filteredMeetings = filteredMeetings.filter(m => {
        const meetingDate = new Date(m.datetimein).toISOString().split('T')[0];
        return meetingDate === dateFilter;
      });
    }

    const getRoomNumber = (roomName) => {
      if (typeof roomName !== 'string') return 0;
      const match = roomName.trim().match(/\d+$/);
      return match ? parseInt(match[0], 10) : 0;
    };

    const sortedMeetings = [...filteredMeetings].sort((a, b) => {
      const dateA = new Date(a.datetimein);
      const dateB = new Date(b.datetimein);
      const dayA = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
      const dayB = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());

      if (dayB - dayA !== 0) return dayB - dayA;

      const roomNumberA = getRoomNumber(a.room);
      const roomNumberB = getRoomNumber(b.room);
      if (roomNumberA !== roomNumberB) return roomNumberA - roomNumberB;

      return dateA - dateB;
    });

    res.render('user-dashboard', {
      user,
      employeeName: employee.name,
      meetings: sortedMeetings,
      roomFilter,
      dateFilter,
    });
  } catch (err) {
    console.error('User dashboard error:', err);
    res.status(500).send('Server error');
  }
};

// ➕ Create Meeting (with email notification for all) - (แก้ไขแล้ว)
exports.createMeeting = async (req, res) => {
  console.log('===> createMeeting called');
  try {
    const { room, date, timein, timeout, purpose, customPurpose, equipment, remark, participants } = req.body;
    const user = req.session.user;

    const employee = await Employee.findOne({ employeeid: user.username });
    if (!employee) return res.status(404).send('Employee not found');

    const datetimein = new Date(`${date}T${timein}`);
    const datetimeout = new Date(`${date}T${timeout}`);

    if (datetimeout <= datetimein) {
      req.flash('error_msg', 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
      return res.redirect('back');
    }

    const finalPurpose = (purpose === 'อื่น ๆ' && customPurpose) ? customPurpose : purpose;

    let participantIds = [];
    if (participants) {
        const idsOrNames = (Array.isArray(participants) ? participants : [participants])
            .map(p => p.trim())
            .filter(p => p); // ลบค่าว่างออก

        const numbers = idsOrNames.map(val => parseInt(val, 10)).filter(num => !isNaN(num));
        const strings = idsOrNames.filter(val => isNaN(parseInt(val, 10)));

        const foundByIds = numbers.length > 0 ? await Employee.find({ employeeid: { $in: numbers } }) : [];
        const foundByNames = strings.length > 0 ? await Employee.find({ name: { $in: strings } }) : [];
      
        const foundEmployees = [...foundByIds, ...foundByNames];
        const uniqueEmployeeIds = [...new Map(foundEmployees.map(item => [item._id.toString(), item._id])).values()];
        participantIds = uniqueEmployeeIds;
    }

    if (!participantIds.some(id => id.equals(employee._id))) {
      participantIds.push(employee._id);
    }

    const newMeeting = new MeetingList({
      employee: employee._id, room, datetimein, datetimeout,
      purpose: finalPurpose, equipment, remark,
      participants: participantIds, approval: 'รออนุมัติ'
    });

    await newMeeting.save();

    const populatedMeeting = await MeetingList.findById(newMeeting._id)
      .populate('employee', 'name email')
      .populate('participants', 'name email');

    const recipients = new Set(populatedMeeting.participants.map(p => p.email).filter(Boolean));
    if (populatedMeeting.employee && populatedMeeting.employee.email) recipients.add(populatedMeeting.employee.email);
    const bccList = Array.from(recipients).join(',');

    const subjectToParticipants = `คำเชิญเข้าร่วมประชุม: ${populatedMeeting.purpose}`;
    const htmlToParticipants = `
      <p>เรียน ผู้เข้าร่วมประชุม,</p>
      <p>คุณได้รับเชิญให้เข้าร่วมการประชุมเรื่อง "<b>${populatedMeeting.purpose}</b>" โดยคุณ ${populatedMeeting.employee.name}</p>
      <p><b>วันเวลา:</b> ${new Date(populatedMeeting.datetimein).toLocaleString('th-TH')}</p>
      <p><b>ห้อง:</b> ${populatedMeeting.room}</p>
      <p><i>*** การประชุมนี้กำลังรอการอนุมัติจากผู้ดูแลระบบ ***</i></p>
      <hr>
      <p>โปรดตรวจสอบรายละเอียดในระบบ MeetingRoom</p>
    `;

    const result = await sendEmail('', subjectToParticipants, htmlToParticipants, bccList);

    if (result) {
      req.flash('success_msg', 'ส่งคำขอจองห้องประชุมและแจ้งเตือนผู้เข้าร่วมทางอีเมลเรียบร้อยแล้ว');
    } else {
      req.flash('error_msg', 'ส่งคำขอจองสำเร็จ แต่การแจ้งเตือนทางอีเมลล้มเหลว');
    }

    res.redirect('/user/dashboard');
  } catch (err) {
    console.error('Create meeting error:', err);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการสร้างการจอง');
    res.status(500).send('Server error');
  }
};

// 🗑️ Delete Meeting (with email notification for all)
exports.deleteMeeting = async (req, res) => {
  try {
    const { id } = req.body;
    const user = req.session.user;

    const employee = await Employee.findOne({ employeeid: user.username });
    if (!employee) return res.status(403).json({ success: false, message: 'User not found.' });

    const deletedMeeting = await MeetingList.findById(id)
      .populate('employee', 'name email')
      .populate('participants', 'name email');

    if (!deletedMeeting) return res.status(404).json({ success: false, message: 'Meeting not found.' });
    if (deletedMeeting.employee._id.toString() !== employee._id.toString()) {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }

    await MeetingList.findByIdAndDelete(id);

    const subject = `[ถูกลบ] การประชุม: ${deletedMeeting.purpose}`;
    const htmlBody = `
        <p>เรียน ทุกท่าน,</p>
        <p>การประชุมเรื่อง "<b>${deletedMeeting.purpose}</b>" ในวันที่ ${new Date(deletedMeeting.datetimein).toLocaleDateString('th-TH')} ได้ถูกลบออกจากระบบโดยผู้จองแล้ว</p>
    `;

    const recipients = new Set(deletedMeeting.participants.map(p => p.email).filter(Boolean));
    if (deletedMeeting.employee && deletedMeeting.employee.email) recipients.add(deletedMeeting.employee.email);
    const bccList = Array.from(recipients).join(',');

    await sendEmail('', subject, htmlBody, bccList);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete meeting error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 🛑 Cancel Meeting (with email notification for all)
exports.cancelMeeting = async (req, res) => {
  try {
    const { id } = req.body;
    const user = req.session.user;

    const employee = await Employee.findOne({ employeeid: user.username });
    if (!employee) return res.status(403).json({ success: false, message: 'User not found.' });

    const meetingToUpdate = await MeetingList.findById(id);
    if (!meetingToUpdate) return res.status(404).json({ success: false, message: 'Meeting not found.' });
    if (meetingToUpdate.employee.toString() !== employee._id.toString()) {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }

    meetingToUpdate.approval = 'ยกเลิก';
    await meetingToUpdate.save();
    
    const canceledMeeting = await MeetingList.findById(id)
        .populate('employee', 'name email')
        .populate('participants', 'name email');

    const subject = `[ยกเลิก] การประชุม: ${canceledMeeting.purpose}`;
    const htmlBody = `
        <p>เรียน ผู้เข้าร่วมประชุมทุกท่าน,</p>
        <p>การประชุมเรื่อง "<b>${canceledMeeting.purpose}</b>" ในวันที่ ${new Date(canceledMeeting.datetimein).toLocaleDateString('th-TH')} ได้ถูกยกเลิกโดยผู้จองแล้ว</p>
        <p>ขออภัยในความไม่สะดวก</p>
    `;

    const recipients = new Set(canceledMeeting.participants.map(p => p.email).filter(Boolean));
    if (canceledMeeting.employee && canceledMeeting.employee.email) recipients.add(canceledMeeting.employee.email);
    const bccList = Array.from(recipients).join(',');

    await sendEmail('', subject, htmlBody, bccList);

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
    if (!meeting) return res.status(404).send('Meeting not found');

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

// 🔄 Update Meeting (with email notification for all) - (แก้ไขแล้ว)
exports.updateMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, timein, timeout, room, purpose, participants, equipment, remark, customPurpose } = req.body;

    const meeting = await MeetingList.findById(id);
    if (!meeting) return res.status(404).send('Meeting not found');

    const user = req.session.user;
    const employee = await Employee.findOne({ employeeid: user.username });
    if (!employee || meeting.employee.toString() !== employee._id.toString()) {
      return res.status(403).send('Permission denied.');
    }

    // เวลาประชุม
    const datetimein = new Date(`${date}T${timein}`);
    const datetimeout = new Date(`${date}T${timeout}`);

    // วัตถุประสงค์
    const finalPurpose = (purpose === 'อื่น ๆ' && customPurpose) ? customPurpose : purpose;

    // --- แก้ไขตรงนี้ ---
    let participantIds = [];
    if (participants) {
      // รองรับทั้งกรณีเป็น array หรือ string
      const arr = Array.isArray(participants) ? participants : [participants];
      // แยกเลขกับชื่อ
      const numbers = arr.map(val => parseInt(val, 10)).filter(num => !isNaN(num));
      const strings = arr.filter(val => isNaN(parseInt(val, 10)) && val && val.trim() !== '');
      // หา Employee จาก employeeid และ name
      const foundByIds = numbers.length > 0 ? await Employee.find({ employeeid: { $in: numbers } }) : [];
      const foundByNames = strings.length > 0 ? await Employee.find({ name: { $in: strings } }) : [];
      // รวมและเอาไม่ซ้ำ
      const foundEmployees = [...foundByIds, ...foundByNames];
      const uniqueEmployeeIds = [...new Map(foundEmployees.map(item => [item._id.toString(), item._id])).values()];
      participantIds = uniqueEmployeeIds;
    }
    // ใส่ผู้จองกลับเข้าไปเสมอถ้ายังไม่มี
    if (!participantIds.some(pId => pId.equals(employee._id))) {
      participantIds.push(employee._id);
    }

    const updatedMeeting = await MeetingList.findByIdAndUpdate(id, 
        { datetimein, datetimeout, room, purpose: finalPurpose, participants: participantIds, equipment, remark, approval: 'อนุมัติ' },
        { new: true }
    )
    .populate('employee', 'name email')
    .populate('participants', 'name email');

    // ส่งอีเมลแจ้งเตือน (เหมือนเดิม)
    const subject = `[อัปเดต] การประชุม: ${updatedMeeting.purpose}`;
    const htmlBody = `
        <p>เรียน ผู้เข้าร่วมประชุมทุกท่าน,</p>
        <p>การประชุมเรื่อง "<b>${updatedMeeting.purpose}</b>" มีการเปลี่ยนแปลงข้อมูล และต้องรอการอนุมัติใหม่</p>
        <ul>
            <li><b>ห้องประชุม:</b> ${updatedMeeting.room}</li>
            <li><b>วันเวลาใหม่:</b> ${new Date(updatedMeeting.datetimein).toLocaleDateString('th-TH')} เวลา ${new Date(updatedMeeting.datetimein).toLocaleTimeString('th-TH')} - ${new Date(updatedMeeting.datetimeout).toLocaleTimeString('th-TH')}</li>
        </ul>
        <hr>
        <p>โปรดตรวจสอบรายละเอียดในระบบ MeetingRoom</p>
    `;
    
    const recipients = new Set(updatedMeeting.participants.map(p => p.email).filter(Boolean));
    if (updatedMeeting.employee && updatedMeeting.employee.email) recipients.add(updatedMeeting.employee.email);
    const bccList = Array.from(recipients).join(',');

    const result = await sendEmail('', subject, htmlBody, bccList);

    if (result) {
      req.flash('success_msg', 'อัปเดตข้อมูลและส่งอีเมลแจ้งเตือนผู้เกี่ยวข้องเรียบร้อยแล้ว');
    } else {
      req.flash('error_msg', 'อัปเดตข้อมูลสำเร็จ แต่ส่งอีเมลแจ้งเตือนไม่สำเร็จ');
    }

    res.redirect('/user/dashboard');
  } catch (err) {
    console.error('Update meeting error:', err);
    req.flash('error_msg', 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
    res.status(500).send('Server error');
  }
};