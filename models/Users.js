const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    confirmPassword: {
      type: String,
      required: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isTaskEarner: {
      type: Boolean,
      default: false,
    },
    isTaskCreator: {
      type: Boolean,
      default: false,
    },
    userImageUrl: {
      type: String,
    },
    cloudinaryId: {
      type: String,
    },
    bio: {
      type: String,
    },
    expertise: {
      type: String,
      enum: ["Web Development", "Content Writing", "DevOps", "UI/UX Design"]
    },
    languages: {
      type: String,
      enum: ["English", "French", "Spanish", "German", "Chinese"]
    },
    location: {
      type: String,
      enum: ["Nigeria", "Rwanda", "Kenya", "United States", "Spain", "France"]
    },
    getNotifiedAboutNewTasks: {
      type: Boolean,
      default: false,
    },
    receivePaymentConfirmations: {
      type: Boolean,
      default: false,
    },
    referralCode:{
      type: String,
      unique: true,
  },
    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,
    verificationToken: String,
    verificationTokenExpiresAt: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);