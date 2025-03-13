const { generateAlphanumericCode } = require("../helpers/helpers");
const referralModel = require("../models/referralModel");
const Users = require("../models/Users");
const { sendEmailNotification } = require("../utils/emailHandler/emailNotification");
const { generateReferralEmailTemplate } = require("../utils/emailHandler/referralMail");

const sendReferralInvite = async (req, res) => {
  try {
    const userId = req.user._id;
    const { email } = req.body
    if (!email) {
      return res.status(400).json({
        status: false,
        message: "Parameters missing!"
      })
    }

    const user = await Users.findById(userId);
    let referralCode = user.referralCode;
    if (!referralCode) {
      referralCode = generateAlphanumericCode(8);
      user.referralCode = referralCode;
      await user.save();
    }

    // Create referral link and send invite to mail
    const referralLink = `${process.env.FRONTEND_SIGN_UP_TASK_EARNER_URL}?referralCode=${referralCode}`
    const referralMailSubject = "You're Invited to AltBucks!"
    const emailHTML = generateReferralEmailTemplate(user.firstName, user.lastName, referralLink);
    await sendEmailNotification(email, referralMailSubject, emailHTML);

    const referral = await referralModel.create({
      email: email,
      earnerId: userId,
      sentAt: new Date(),
      status: "pending",
    });

    res.status(200).json({
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

module.exports = {
  sendReferralInvite,
}