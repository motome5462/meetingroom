const mongoose = require('mongoose');

const meetinglistSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "employee" },
  datetimein: { type: Date, required: true },
  datetimeout: { type: Date, required: true },
  room: { type: String, required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "employee" }],
  purpose: { type: String, default: "" },
  equipment: { type: String, default: "" },
  remark: { type: String, default: "" },
  approval: { type: String, default: "" },
});

module.exports = mongoose.model('Meeting', meetinglistSchema);
