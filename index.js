const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./db')
const userRoutes = require('./routes/userRoutes');
const multer = require('multer'); // Add multer
const taskRoutes = require('./routes/taskRoutes');
require('dotenv').config();

const app = express();

// Connect to MongoDB
connectDB();

// CORS Configuration (Allow Frontend to Access Cookies)
// const corsOptions = {
//     origin: process.env.CLIENT_URL || 'http://localhost:3000', // Allow frontend origin
//     credentials: true, // Allow cookies/auth headers
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
//     exposedHeaders: ['set-cookie'] // Allow frontend to read cookies
// };

const allowedOrigins = [
    'http://localhost:3000',
    'https://altbucks-ipat.vercel.app'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    exposedHeaders: ['set-cookie']
};

const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(express.json()); // Parse JSON request body
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions)); // Apply CORS
app.use(cookieParser()); // Parse cookies from requests

// Routes
app.use('/users', userRoutes);
app.use('/tasks', taskRoutes);

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