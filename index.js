const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const userRoutes = require('./routes/userRoutes');
require('dotenv').config();

const app = express();

// Connect to MongoDB
connectDB();

// CORS Configuration
const corsOptions = {
    origin: process.env.CLIENT_URL || 'http://localhost:3000', // Allow frontend origin
    credentials: true, // Allow cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
};

// Middleware
app.use(express.json()); // Parse JSON request body
app.use(cors(corsOptions)); // Apply CORS

// Routes
app.use('/users', userRoutes);

// Handle undefined routes
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Central error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message); // Log error

    res.status(500).json({
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});