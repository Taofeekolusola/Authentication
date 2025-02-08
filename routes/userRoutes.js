const express = require('express');
const cors = require('cors');
const connectDB = require('./db'); 
const userRoutes = require('./routes/userRoutes');

require('dotenv').config();

const app = express();

// Connect to MongoDB
connectDB();

// Enable CORS with proper settings
app.use(cors({
    origin: '*', // Allow all origins (try 'http://localhost:3000' if frontend is local)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Middleware
app.use(express.json());

// Routes
app.use('/users', userRoutes);

// Handle undefined routes
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Central error handling middleware
app.use((err, req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }
    res.status(500).json({ message: err.message || 'Internal Server Error' });
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});