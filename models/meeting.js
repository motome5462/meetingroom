const mongoose = require("mongoose");


const meetinglistSchema  = new mongoose.Schema({
    name: { type: String, default: "" },
    dept: { type: String, default: "" },
    title: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },  
    datetimein:{ type: Date, default: null },
    datetimeout:{ type: Date, default: null },
    room:{type: String, default: "" },
    participants:[{type: String, default: "" }],
    purpose:{type: String, default: "" },
    equipment:{type: String, default: "" },
    remark:{type: String, default: "" },
    approval:{type: String, default: "" },


})
module.exports = mongoose.model("meetinglist",meetinglistSchema)