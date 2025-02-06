require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection logic
const connectDB = () => {
    const dbURI = process.env.MONGODB_URI;

    mongoose
        .connect(dbURI)
        .then(() => {
            console.log('Connected to MongoDB Atlas');
        })
        .catch((err) => {
            console.error('Error connecting to MongoDB Atlas:', err);
        });
};

module.exports = connectDB;