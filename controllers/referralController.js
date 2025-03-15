const Joi = require("joi");
const ReferralModel = require("../models/referralModel");
const Users = require("../models/Users");
const { sendReferralEmail } = require("../utils/emailHandler/emailReferral");
const { generateReferralEmailTemplate } = require("../utils/emailHandler/referralMail");
const paginate = require("../utils/paginate");
require("dotenv").config()

const sendReferralInviteSchema = Joi.object({
  email: Joi.string().email().required(),
});
const sendReferralInvite = async (req, res) => {
  try {
    const { error, value } = sendReferralInviteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    const userId = req.user._id;
    const { email } = value

    // Check if user with email already exists
    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: false,
        message: "This user has already signed up.",
      });
    }

    const user = await Users.findById(userId);
    let referralCode = user.referralCode;
    if (!referralCode) {
      return res.status(400).json({ status: false, message: "Please log out and log back in" });
    }

    // Create referral link and send invite to mail
    const referralLink = `${process.env.FRONTEND_SIGN_UP_TASK_EARNER_URL}?referralCode=${referralCode}`;
    const referralMailSubject = "You're Invited to AltBucks!"
    const emailHTML = generateReferralEmailTemplate(user.firstName, user.lastName, referralLink);
    await sendReferralEmail(email, referralMailSubject, emailHTML);

    let referral = await ReferralModel.findOneAndUpdate(
      { email, earnerId: userId },
      { status: "pending" },
      { new: true, upsert: true }
    );

    res.status(201).json({
      success:true,
      message:"Referral invite sent!",
      data: {
          referral
      },
  })
  }
  catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

const referralListSchema = Joi.object({
  status: Joi.string().valid("pending", "accepted", "cancelled"),
  fromDate: Joi.date().iso().messages({ "date.format": "fromDate must be in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)" }),
  toDate: Joi.date().iso().messages({ "date.format": "toDate must be in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)" }),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

const getReferralList = async (req, res) => {
  try {
    const { error, value } = referralListSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    const { status, fromDate, toDate, page = 1, limit = 10 } = value

    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const skip = (pageNumber - 1) * pageSize;

    const query = {};

    if (status) query.status = status;
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    const [referrals, total] = await Promise.all([
      ReferralModel.find(query)
        .skip(skip)
        .limit(pageSize)
        .sort({ createdAt: -1 }),
      ReferralModel.countDocuments(query),
    ]);

    res.status(200).json({
      success:true,
      message:"Referrals retrieved successfully!",
      data: referrals,
      pagination: paginate(total, page, limit),
    })
  }
  catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

const getReferralLink = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await Users.findById(userId);
    let referralCode = user.referralCode;
    if (!referralCode) {
      return res.status(400).json({ status: false, message: "Please log out and log back in" });
    }
    const referralLink = `${process.env.FRONTEND_SIGN_UP_TASK_EARNER_URL}?referralCode=${referralCode}`;
    res.status(200).json({
      success:true,
      message:"Referral link retrieved successfully!",
      data: { referralLink },
    })
  }
  catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  } 
}

const getReferralStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const rewardPerReferral = parseInt(process.env.REWARD_PER_REFERRAL, 10);
    const totalAcceptedReferrals = await ReferralModel.countDocuments({
      earnerId: userId,
      status: "accepted",
    });
    console.log(totalAcceptedReferrals)

    const totalPendingReferrals = await ReferralModel.countDocuments({
      earnerId: userId,
      status: "pending",
    });
    console.log(totalPendingReferrals)

    res.status(200).json({
      success:true,
      message:"Referral stats retrieved successfully!",
      data: {
        totalReferrals: totalAcceptedReferrals,
        pendingRewards: totalPendingReferrals * rewardPerReferral,
        earnedRewards: totalAcceptedReferrals * rewardPerReferral,
      },
    })
  }
  catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = {
  sendReferralInvite,
  getReferralList,
  getReferralLink,
  getReferralStats,
}