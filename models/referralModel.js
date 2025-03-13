const mongoose = require("mongoose");

const ReferralSchema = new mongoose.Schema(
  {
    earnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    email:{
        type: String,
        required: false,
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "cancelled"],
        default: "pending",
        required: true,
    },
    sentAt: {
        type: Date,
        default: null,
    },
    acceptedAt: {
        type: Date,
        default: null,
    },
    status: { 
        type: String, 
        enum: ["pending", "successful", "failed"], 
        default: "pending" 
    },
  },
  { timestamps: true }
);

const referralModel = mongoose.model("Referral", ReferralSchema);
module.exports = referralModel;