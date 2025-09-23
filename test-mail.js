require('dotenv').config();
const sendEmail = require('./utils/mailer');
sendEmail('natthaphong.t@mot.co.th', 'ทดสอบ', '<b>ไอ้ชิบหายยยยย</b>').then(console.log);