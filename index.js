const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./db');
const userRoutes = require('./routes/userRoutes');
const multer = require('multer'); // Add multer
const taskRoutes = require('./routes/taskRoutes');
require('dotenv').config();
const session = require('express-session');
const MongoStore = require('connect-mongo'); // ✅ Use MongoDB for session storage

const app = express();

// Connect to MongoDB
connectDB();

// CORS Configuration (Allow Frontend to Access Cookies)
const allowedOrigins = [
    'http://localhost:3000',
    'https://altbucks-ipat.vercel.app',
    'https://authentication-1-bqvg.onrender.com'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,  // Allow cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    exposedHeaders: ['set-cookie']
};

const upload = multer({ dest: 'uploads/' });

// ✅ Use MongoDB for session storage
app.use(
    session({
        secret: process.env.SESSION_SECRET || "sessionsecretcode",
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URI || "mongodb://localhost:27017/mydatabase", // Use MongoDB URL
            collectionName: "sessions", // Collection to store sessions
        }),
        cookie: { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === "production", // Set `true` in production (HTTPS required)
            sameSite: "Strict",
            maxAge: 24 * 60 * 60 * 1000 // 1 day expiration
        }
    })
);

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