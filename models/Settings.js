const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    autoSaveDrafts: {
      type: Boolean,
      default: true,
    },
    soundNotifications: {
      type: Boolean,
      default: true,
    },
    inAppNotifications: {
      type: Boolean,
      default: true,
    },
    smsNotification: {
      type: Boolean,
      default: false,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    dataSharingPreferences: {
      type: Boolean,
      default: false,
    },
    activityHistory: {
      type: Boolean,
      default: true,
    },
    thirdPartyIntegrations: {
      type: Boolean,
      default: false,
    },
    profileVisibility: {
      type: String,
      enum: ["public", "private"],
      default: "private",
    },
    nameOnCard: {
      type: String,
    },
    cardNumber: {
      type: String,
    },
    cardCvv: {
      type: String,
    },
    cardExpDate: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Settings", settingsSchema);