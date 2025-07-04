const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({

  employeeid: { type: Number, default: "" },
  name: { type: String, default: "" },
  department: { type: String, required: true },
  title: { type: String, default: "" },
  moblie: { type: String, default: "" },
  email: { type: String, default: "" },
});

module.exports = mongoose.model('employee', employeeSchema);
