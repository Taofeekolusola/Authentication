const bcrypt = require("bcryptjs");
const User = require("../models/Users");
const nodemailer = require('nodemailer');
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const cloudinary = require('../utils/cloudinary');
const fs = require('fs');
const validateArrayFields = require("../utils/validateArrayFields");
const updateModelFields = require("../utils/updatModelFields");
const Joi = require("joi");
const Settings = require("../models/Settings");

// Signup for Task Earner
const SignupHandlerTaskEarner = async (req, res) => {
  const { firstName, email, password, lastName, phoneNumber, confirmPassword } = req.body;

  try {
    if (!firstName || !email || !password || !lastName || !phoneNumber || !confirmPassword) {
      return res.status(400).json({ message: "Invalid user details" });
    }

    //valid email dormain address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format!" });
    }

    //

    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists in the database!" });
    }

    if (confirmPassword !== password) {
      return res.status(400).json({ message: "Confirm password does not match!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      email,
      password: hashedPassword,
      lastName,
      phoneNumber,
      isTaskEarner: true,
      confirmPassword
    });

    return res.status(201).json({
      success: true,
      message: "Task Earner created!",
      newUser
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Signup for Task Creator
const SignupHandlerTaskCreator = async (req, res) => {
  const { firstName, email, password, lastName, phoneNumber, confirmPassword } = req.body;

  try {
    if (!firstName || !email || !password || !lastName || !phoneNumber || !confirmPassword) {
      return res.status(400).json({ message: "Invalid user details" });
    }

    //valid email dormain address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format!" });
    }

    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists in the database!" });
    }

    if (confirmPassword !== password) {
      return res.status(400).json({ message: "Confirm password does not match!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      email,
      password: hashedPassword,
      lastName,
      phoneNumber,
      isTaskCreator: true,
      confirmPassword
    });

    return res.status(201).json({
      success: true,
      message: "Task Creator created!",
      newUser
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// const loginHandler = async (req, res) => {
//   try {
//     const { email, password, rememberMe } = req.body;

//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(401).json({ message: "Invalid email or password" });
//     }

//     // Validate email format
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       return res.status(400).json({ message: "Invalid email format!" });
//     }

//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       return res.status(401).json({ message: "Invalid email or password" });
//     }

//     // Store user session
//     req.session.userId = user._id;
//     req.session.email = user.email;

//     // Set session expiry based on 'rememberMe'
//     if (rememberMe) {
//       req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
//     } else {
//       req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 1 day
//     }

//     res.json({ message: "Login successful", user: { id: user._id, email: user.email } });

//   } catch (error) {
//     console.error("Login error:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

const loginHandler = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = loginHandler;

// const loginHandler = async (req, res) => {
//   try {
//     const { email, password, rememberMe } = req.body;

//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(401).json({ message: "Invalid email or password" });
//     }

//     //valid email dormain address
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       return res.status(400).json({ message: "Invalid email format!" });
//     }

//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       return res.status(401).json({ message: "Invalid email or password" });
//     }

//     // Set token expiration based on 'rememberMe'
//     const tokenExpiration = rememberMe ? '30d' : '1d'; // 30 days if checked, 1 day otherwise
//     const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

//     const token = jwt.sign(
//       { id: user._id, email: user.email },
//       process.env.JWT_SECRET,
//       { expiresIn: tokenExpiration }
//     );

//     // Set cookie based on 'rememberMe'
//     res.cookie("authToken", token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "Strict",
//       maxAge: cookieMaxAge, // 30 days or 1 day
//     });

//     return res.status(200).json({ message: "Login successful" });
//   } catch (error) {
//     console.error("Login error:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };


// Send Email Helper Function
const sendEmail = async (email, resetCode) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Reset Code",
    html: `<p>Your password reset code is: <strong>${resetCode}</strong></p>
           <p>Use this code to reset your password. The code expires in 1 hour.</p>`,
  };

  await transporter.sendMail(mailOptions);
};

// Request Password Reset
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetCode = crypto.randomInt(10000, 99999).toString();
    const expiresAt = Date.now() + 3600000; // 1-hour expiry

    user.resetPasswordToken = resetCode;
    user.resetPasswordExpiresAt = expiresAt;
    await user.save();

    await sendEmail(user.email, resetCode);

    return res.status(200).json({ message: "Password reset code sent to your email" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Verify Reset Code
const verifyResetCode = async (req, res) => {
  try {
    const { resetCode } = req.body;

    const user = await User.findOne({ resetPasswordToken: resetCode });

    if (!user || Date.now() > user.resetPasswordExpiresAt) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    // Generate the verification token
    const verificationToken = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });

    // Calculate the expiration date
    const verificationTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Save the token and expiration date in the database
    user.verificationToken = verificationToken;
    user.verificationTokenExpiresAt = verificationTokenExpiresAt;
    await user.save();

    return res.json({ message: "Reset code verified", verificationToken });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword, resetCode, email } = req.body;
    
    if (!email && !resetCode) {
      return res.status(400).json({ message: "Email or reset code is required" });
    } 

    //const token = req.headers.authorization?.split(" ")[1];

    // if (!token) {
    //   return res.status(401).json({ message: "Unauthorized request" });
    // }

    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpiresAt = null;
    await user.save();

    return res.json({ message: "Password has been reset successfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get User by Id
// const getUserProfile = async (req, res) => {
//   try {
//     // Check if the user is authenticated
//     if (!req.session.userId) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     // Fetch user profile using the ID stored in the session
//     const userProfile = await User.findById(req.session.userId).select(
//       "firstName lastName email phoneNumber createdAt"
//     );

//     if (!userProfile) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     return res.json({ profile: userProfile });
//   } catch (error) {
//     console.error("Get user profile error:", error);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

const getUserProfile = async (req, res) => {
  try {
      console.log("🔍 req.user in getUserProfile:", req.user);

      if (!req.user || !req.user._id || !req.user._id.toString()) {
          console.log("req.user is missing or invalid");
          return res.status(401).json({ message: "Unauthorized" });
      }

      const userProfile = await User.findById(req.user._id).select(
          "firstName lastName email phoneNumber createdAt"
      );

      if (!userProfile) {
          return res.status(404).json({ message: "User not found" });
      }

      return res.json({ profile: userProfile });
  } catch (error) {
      console.error("Get user profile error:", error.message);
      return res.status(500).json({ message: "Internal Server Error" });
  }
};

const allowedLanguages = ["English", "French", "Spanish", "German", "Chinese"];
const allowedExpertise = ["Web Development", "Content Writing", "DevOps", "UI/UX Design"];

const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const userData = {
      firstName: req.body.firstName || user.firstName,
      lastName: req.body.lastName || user.lastName,
      location: req.body.location || user.location,
      bio: req.body.bio || user.bio,
      languages: user.languages,
      expertise: user.expertise,
      userImageUrl: user.userImageUrl,
      cloudinaryId: user.cloudinaryId,
    };

    try {
      if (req.body.languages) userData.languages = validateArrayFields(req.body.languages, allowedLanguages);
      if (req.body.expertise) userData.expertise = validateArrayFields(req.body.expertise, allowedExpertise);
    } catch (validationError) {
      return res.status(400).json({ message: validationError.message });
    }

    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path);
        userData.userImageUrl = result.secure_url;
        userData.cloudinaryId = result.public_id;
        fs.unlinkSync(req.file.path); // Delete file after successful upload
      } catch (cloudinaryError) {
        return res.status(500).json({ message: "Failed to upload image" });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, userData, { new: true });
    res.status(200).json({
      success: true,
      message: "Successfully updated user profile!",
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const changeAccountSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    const allowedUpdates = ["getNotifiedAboutNewTasks", "receivePaymentConfirmations"];
    const userData = updateModelFields(req.body, allowedUpdates);

    if (currentPassword || newPassword || confirmNewPassword) {
      const passwordUpdate = await handlePasswordUpdate(userId, currentPassword, newPassword, confirmNewPassword);
      if (passwordUpdate.error) {
        return res.status(passwordUpdate.status).json({ message: passwordUpdate.error });
      }
      userData.password = passwordUpdate.password;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, userData, { new: true, runValidators: true });
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Successfully updated account settings!",
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

const handlePasswordUpdate = async (userId, currentPassword, newPassword, confirmNewPassword) => {
  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return { error: "Missing Parameters!", status: 400 };
  }

  const user = await User.findById(userId).select("+password");
  if (!user) return { error: "User not found", status: 404 };

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordValid) return { error: "Incorrect Password!", status: 400 };

  if (newPassword !== confirmNewPassword) return { error: "Passwords do not match!", status: 400 };

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  return { password: hashedPassword };
};

const settingsSchema = Joi.object({
  autoSaveDrafts: Joi.boolean().optional(),
  soundNotifications: Joi.boolean().optional(),
  inAppNotifications: Joi.boolean().optional(),
  smsNotification: Joi.boolean().optional(),
  emailNotifications: Joi.boolean().optional(),
  dataSharingPreferences: Joi.boolean().optional(),
  activityHistory: Joi.boolean().optional(),
  thirdPartyIntegrations: Joi.boolean().optional(),
  profileVisibility: Joi.string().valid("public", "private").optional(),
  nameOnCard: Joi.string().allow(null, "").optional(),
  cardNumber: Joi.string().creditCard().optional(),
  cardCvv: Joi.string().pattern(/^\d{3}$/).optional(),
  cardExpDate: Joi.string().pattern(/^(0[1-9]|1[0-2])\/\d{2}$/).optional(),
});

const updateUserSettings = async (req, res) => {
  try {
    const userId = req.user._id;

    const { error, value } = settingsSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ message: error.details[0].message });

    if (Object.keys(value).length === 0) {
      return res.status(400).json({ message: "No valid fields provided for update" });
    }

    const updatedSettings = await Settings.findOneAndUpdate(
      { userId },
      { $set: value },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Settings updated successfully!",
      data: updatedSettings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = {
  SignupHandlerTaskCreator,
  SignupHandlerTaskEarner,
  loginHandler,
  requestPasswordReset,
  resetPassword,
  verifyResetCode,
  getUserProfile,
  updateUserProfile,
  changeAccountSettings,
  updateUserSettings
};