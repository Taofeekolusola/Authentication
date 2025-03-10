const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    email: { 
        type: String, 
        required: true 
    },
    subject: { 
        type: String, 
        required: true 
    },
    message: { 
        type: String, 
        required: true 
    },
    date: { 
        type: String, 
        required: true 
    },
    time: { 
        type: String, 
        required: true 
    },
  },
  { timestamps: true }
);


const notificationModel = mongoose.model("Notification", NotificationSchema);
module.exports = notificationModel;