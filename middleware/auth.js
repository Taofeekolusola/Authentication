const jwt = require('jsonwebtoken');
const User = require('../models/Users'); // Ensure correct model import
const mongoose = require('mongoose');

const validation = async (req, res, next) => {
    try {
        if (!req.headers.authorization) {
            return res.status(401).json({ 
                message: 'Authorization header is required'
            });
        }

        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            return res.status(401).json({ 
                message: 'Token is required'
            });
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET);
        if (!payload || !mongoose.Types.ObjectId.isValid(payload.id)) {
            return res.status(401).json({ 
                message: 'Invalid token'
            });
        }

        const user = await User.findById(payload.id);
        if (!user) {
            return res.status(401).json({ 
                message: 'Unauthorized'
            });
        }

        req.user = user;
        next();
    
    } catch (error) {
        res.status(500).json({ 
            message: error.message
        });
    }
};

module.exports = { validation };