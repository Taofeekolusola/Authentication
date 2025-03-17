require('dotenv').config(); // Ensure dotenv is loaded
const mongoose = require('mongoose');


const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI; // Ensure it's fetched correctly
        if (!mongoURI) throw new Error("MONGO_URI is missing");


        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });


        console.log("MongoDB connected successfully");
    } catch (err) {
        console.error("Error connecting to MongoDB Atlas:", err.message);
        process.exit(1);
    }
};


module.exports = connectDB;
