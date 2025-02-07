const bcrypt = require("bcryptjs");
const User = require("../models/Users");
const nodemailer = require('nodemailer');
const jwt = require("jsonwebtoken")
const crypto = require('crypto');

const SignupHandlerTaskEarner = async (req, res) => {
  const { firstName, email, password, lastName, phoneNumber, confirmPassword } = req.body;
  
  try {
    if (!firstName || !email || !password || !lastName || !phoneNumber || !confirmPassword) {
      res.status(401).json("invalid user details")
    }

    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) {
      res.status(401).json("Email already exists in the database!");
    }

    if (confirmPassword !== password) {
        res.status(401).json("Confirm password does not match!");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      email,
      password: hashedPassword,
      lastName,
      phoneNumber,
      confirmPassword,
      isTaskEarner: true,
    });

    res.status(201).json({
      success: true,
      message: "Task Earner created!",
      newUser,
    });
  } catch (error) {
      console.error(error);
      res.status(500).json("Internal Server Error");
    }
};

const SignupHandlerTaskCreator = async (req, res) => {
  const { firstName, email, password, lastName, phoneNumber, confirmPassword } = req.body;

  try {
    if (!firstName || !email || !password || !lastName || !phoneNumber || !confirmPassword) {
      return res.status(401).json("Invalid user details");
    }

    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) {
      return res.status(401).json("Email already exists in the database!");
    }

    if (confirmPassword !== password) {
      return res.status(401).json("Confirm password does not match!");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      email,
      password: hashedPassword,
      lastName,
      phoneNumber,
      confirmPassword,
      isTaskCreator: true,
    });

    res.status(201).json({
      success: true,
      message: "Task Creator created!",
      newUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json("Internal Server Error");
  }
};

const loginHandler = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user in MongoDB (Mongoose uses `findOne` without `where`)
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email' });
        }

        // Compare passwords
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        // Create JWT token
        const payload = {
            id: user._id, 
            email: user.email,
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({ token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Function to send email
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

// Request Password Reset (Send Code to Email)
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate reset code (6-digit)
    const resetCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 3600000; // 1-hour expiry

    // Save reset code and expiration in the database
    user.resetPasswordToken = resetCode;
    user.resetPasswordExpiresAt = expiresAt;
    await user.save();

    // Send reset code via email
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

    // Find user by reset code
    const user = await User.findOne({ resetPasswordToken: resetCode });

    if (!user || Date.now() > user.resetPasswordExpiresAt) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    // Generate a JWT token for password reset
    const resetToken = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: "2m" });
    console.log(resetToken);

    return res.json({ message: "Reset code verified", resetToken });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const token = req.headers["authorization"]?.split(" ")[1]; // Extract token from header

    if (!token) {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    // Verify and decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Ensure passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Hash the new password before saving
    user.password = await bcrypt.hash(password, 10);

    // Clear reset fields
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