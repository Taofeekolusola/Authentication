const bcrypt = require("bcryptjs");
const User = require("../models/Users");
const nodemailer = require('nodemailer');
const jwt = require("jsonwebtoken");
const crypto = require('crypto');

// Signup for Task Earner
const SignupHandlerTaskEarner = async (req, res) => {
  const { firstName, email, password, lastName, phoneNumber, confirmPassword } = req.body;
  
  try {
    if (!firstName || !email || !password || !lastName || !phoneNumber || !confirmPassword) {
      return res.status(400).json({ message: "Invalid user details" });
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
      isTaskEarner: true,
      confirmPassword: hashedPassword
    });

    return res.status(201).json({
      success: true,
      message: "Task Earner created!",
      userId: newUser._id,
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
    });

    return res.status(201).json({
      success: true,
      message: "Task Creator created!",
      userId: newUser._id,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Login Handler
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

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({ token });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

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

    const resetToken = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: "2m" });

    return res.json({ message: "Reset code verified", resetToken });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });

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

module.exports = {
  SignupHandlerTaskCreator,
  SignupHandlerTaskEarner,
  loginHandler,
  requestPasswordReset,
  resetPassword,
  verifyResetCode,
};
