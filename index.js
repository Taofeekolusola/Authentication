const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./db');
const userRoutes = require('./routes/userRoutes');
const multer = require('multer');
const taskRoutes = require('./routes/taskRoutes');
const paymentRoute = require("./routes/paymentRoute");
const webhookRoute = require("./routes/webhookRoute");
const authRoutes = require("./routes/authRoutes");
const referralRoutes = require("./routes/referralRoutes");
require('dotenv').config();
const session = require('express-session');
const MongoStore = require('connect-mongo');

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
    credentials: true,  // Required to allow cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    exposedHeaders: ['set-cookie']
};


// Middleware to parse raw body for the Stripe webhook
app.use('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' })); // Correctly set content type

// Middleware to add raw body to req object
app.use('/api/v1/webhooks/stripe', (req, res, next) => {
    if (req.headers["stripe-signature"]) {
        req.rawBody = req.body; // Use raw body for signature verification
    }
    next();
});


// Apply CORS Middleware FIRST (before session)
app.use(cors(corsOptions));

// Apply Cookie Parser
app.use(cookieParser());

// Session Configuration (Use MongoDB for session storage)
// app.use(
//     session({
//         secret: process.env.SESSION_SECRET || "sessionsecretcode",
//         resave: false,
//         saveUninitialized: false,
//         store: MongoStore.create({
//             mongoUrl: process.env.MONGODB_URI || "mongodb://localhost:27017/mydatabase",
//             collectionName: "sessions",
//         }),
//         cookie: { 
//             httpOnly: true, 
//             secure: process.env.NODE_ENV === "production", // Set `true` in production
//             sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", // Allow cross-origin cookies in production
//             maxAge: 24 * 60 * 60 * 1000 // 1 day expiration
//         }
//     })
// );

// Middleware
app.use(express.json()); // Parse JSON request body
app.use(express.urlencoded({ extended: true }));

app.get('/', async (req, res) => {
    return res.send("Welcome to The Alternative Bucks! API");
});

// Routes
app.use('/users', userRoutes);
app.use('/tasks', taskRoutes);
app.use('/api/v1', paymentRoute);
app.use('/api/v1/webhooks', webhookRoute);
app.use('/api/v1/auth', authRoutes);
app.use("/api/v1/referrals", referralRoutes);
app.use('/uploads', express.static('uploads'));

// Handle undefined routes
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Central error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);

    res.status(500).json({
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});