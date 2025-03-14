const cloudinary = require('../utils/cloudinary');
const jwt = require("jsonwebtoken");
const { getGoogleOauthToken, getGoogleUser } = require('../services/authServices');
const User = require("../models/Users");
const { generateToken, generateAlphanumericCode } = require("../helpers/helpers");

const googleOauthHandler = async (req, res) => {
  try{
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ message: "Authorization code not provided!" });
    }
    // Use the code to get the id and access tokens
    const { id_token, access_token } = await getGoogleOauthToken(code);

    // Use the token to get the User
    const { email, verified_email } = await getGoogleUser( id_token, access_token);

    // Check if user is verified
    if (!verified_email) {
      return res.status(403).json({ message: "Google account not verified" })
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Unregistered email" });
    }
    // Generate referral code if missing
    if (!user.referralCode) {
      user.referralCode = generateAlphanumericCode(8);
      user = await User.findOneAndUpdate(
        { email },
        { $set: { referralCode } },
        { new: true }
      );
    }

    const token = generateToken({ userId: user._id }, "1d");

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.confirmPassword;
    res.status(200).json({
      message: "Google OAuth login successful",
      token,
      data: userObj
    });
  }
  catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = {
  googleOauthHandler
}