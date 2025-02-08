const express = require('express');
const cors = require('cors');
const connectDB = require('./db'); // Import database connection
const userRoutes = require('./routes/userRoutes');

require('dotenv').config();

const app = express();

// Connect to MongoDB
connectDB(); 

// CORS Configuration
const corsOptions = {
    origin: 'http://localhost:3000', // Allow requests from frontend
    credentials: true, // Allow cookies & authentication headers
    methods: 'GET, POST, PUT, DELETE, OPTIONS',
    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
};

app.use(cors(corsOptions)); // Apply CORS middleware

// Handle Preflight Requests Manually (for some strict policies)
app.options('*', (req, res) => {
    res.set(corsOptions);
    res.sendStatus(200);
});

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
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});