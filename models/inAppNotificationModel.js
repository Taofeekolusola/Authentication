const mongoose = require('mongoose');
const { Schema } = mongoose;

const inAppNotificationSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'success', 'error'],
    default: 'info',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});
const InAppNotification = mongoose.model('InAppNotification', inAppNotificationSchema);

module.exports = InAppNotification;
