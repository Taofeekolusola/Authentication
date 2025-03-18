const mongoose = require("mongoose");

const ReferralSchema = new mongoose.Schema(
  {
    referrerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    refereeId: {
      type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
    },
    email:{
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Invite pending", "Invite accepted", "Invite cancelled"],
      default: "Invite pending",
      required: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const ReferralModel = mongoose.model("Referral", ReferralSchema);
module.exports = ReferralModel;