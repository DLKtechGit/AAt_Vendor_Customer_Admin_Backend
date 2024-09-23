const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: "admin",
  },
  password: {
    type: String,
    required: true,
  },
  messages:[
    {
     title:{type:String},
     description:{type:String},
     dateAt:{type:Date,default: Date.now}

    }
  ]
,
});

const adminModel = mongoose.model("admin",adminSchema)

module.exports = adminModel
