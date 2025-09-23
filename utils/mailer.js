const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // สำหรับ port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmail(to, subject, html, bcc = '') {
  try {
    await transporter.sendMail({
      from: `"MeetingRoom" <${process.env.EMAIL_USER}>`,
      to,
      bcc,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error('Send email error:', err);
    return false;
  }
}

module.exports = sendEmail;