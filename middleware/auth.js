const jwt = require('jsonwebtoken');
const User = require('../models/Users');
const mongoose = require('mongoose');

const validation = async (req, res, next) => {
    try {
        console.log("✅ Middleware is executing...");

        // Check if the Authorization header is present
        if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
            console.log("❌ No Authorization Header Found");
            return res.status(401).json({ message: 'Authorization token is required' });
        }

        // Extract the token
        const token = req.headers.authorization.split(' ')[1];
        console.log("🔑 Extracted Token:", token);

        // Verify the token
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        console.log("✅ Decoded Token Payload:", payload);

        if (!payload.userId || !mongoose.Types.ObjectId.isValid(payload.userId)) {
            console.log("❌ Invalid Token Payload");
            return res.status(401).json({ message: 'Invalid token' });
        }

        // Find the user in the database
        const user = await User.findById(payload.userId);
        if (!user) {
            console.log("❌ User Not Found");
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Set req.user properly
        req.user = user;
        console.log("✅ req.user set successfully:", req.user);

        next();
    } catch (error) {
        console.error("❌ Validation Error:", error.message);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

module.exports = { validation };