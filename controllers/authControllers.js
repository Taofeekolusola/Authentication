const User = require("../models/Users");
const cloudinary = require('../utils/cloudinary');
const jwt = require("jsonwebtoken");
const { getGoogleOauthToken, getGoogleUser } = require('../services/authServices');
const Users = require("../models/Users");

const googleOauthHandler = async (req, res) => {
  try{
    const { code } = req.query;

    if (!code) {
      return res.status(401).json({ message: "Authorization code not provided!" });
    }
    // Use the code to get the id and access tokens
    const { id_token, access_token } = await getGoogleOauthToken(code);

    // Use the token to get the User
    const { email, verified_email } = await getGoogleUser( id_token, access_token);

    // Check if user is verified
    if (!verified_email) {
      return res.status(403).json({ message: "Google account not verified" })
    }

    const user = await Users.findOne({ email }).lean(); 
    // Generate JWT Token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const { password: _, confirmPassword: __, ...rest } = user;
    res.status(200).json({
      message: "Google OAuth successful",
      token,
      data: rest
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