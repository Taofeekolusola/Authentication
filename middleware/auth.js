const jwt = require('jsonwebtoken');
const User = require('../models/Users');
const mongoose = require('mongoose');

const validation = async (req, res, next) => {
    try {
        // Check if the Authorization header is present
        if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
            return res.status(401).json({ message: 'Authorization token is required' });
        }

        // Extract the token
        const token = req.headers.authorization.split(' ')[1];

        // Verify the token
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        if (!payload.userId || !mongoose.Types.ObjectId.isValid(payload.userId)) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        // Find the user in the database
        const user = await User.findById(payload.userId);
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Set req.user properly
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

module.exports = { validation };