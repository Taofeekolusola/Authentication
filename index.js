const express = require('express');
const cors = require('cors');
const connectDB = require('./db'); // Import the function
const userRoutes = require('./routes/userRoutes');

require('dotenv').config();

const app = express();

// Connect to MongoDB
connectDB(); // Call the function

// Middleware
app.use(express.json());

// Handle CORS & Preflight Requests
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200); // Handle preflight requests
    }
    next();
});

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