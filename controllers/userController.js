const bcrypt = require("bcryptjs");
const User = require("../models/Users");
const nodemailer = require('nodemailer');
const jwt = require("jsonwebtoken")

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

  
const sendEmail = async (email, resetLink) => {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    };
  
    await transporter.sendMail(mailOptions);
    
    // implement actual email sending in production.
    console.log("reset link " , resetLink)
  };
  
  //desc request password reset (send reset link)
  //route
  //access private
  const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate a reset token (expires in 1 hour)
        const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Construct the reset link (adjust URL to your frontend)
        const resetLink = `http://localhost:5002/auth/reset/${token}`;

        // Send reset email
        await sendEmail(user.email, resetLink);

        return res.status(200).json({ message: 'Password reset link sent to your email' });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
  
  //desc resets a user password
  //route post /auth/reset
  //access private
  const resetPassword = async (req, res) => {
    try {
      const { token, newPassword } = req.body;
  
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
      // Find the user by the ID from the decoded token
      const user = await User.findById(decoded.id);
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Hash the new password before saving it
      const hashedPassword = await bcrypt.hash(newPassword, 10);
  
      // Update the user's password
      user.password = hashedPassword;
      await user.save();
  
      res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  };

module.exports = {
    SignupHandlerTaskCreator,
    SignupHandlerTaskEarner,
    loginHandler,
    requestPasswordReset,
    resetPassword,
};