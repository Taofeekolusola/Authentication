const jwt = require('jsonwebtoken');
const axios = require("axios");
const bcrypt = require('bcryptjs');
const ms = require('ms');
const dotenv = require("dotenv");
dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

// Helps mask the email
exports.maskEmail = (email) => {
    const [name, domain] = email.split("@");
    
    if (!name || !domain) {
        throw new Error("Invalid email format");
    }
  
    const visiblePart = name.slice(0, 5); // Keep the first 5 characters visible
    const maskedPart = "*".repeat(name.length - 5); // Mask the remaining characters
  
    return `${visiblePart}${maskedPart}@${domain}`;
};


// Turns a word or string to Title Case
exports.toTitleCase = (str) => {
    return str.toLowerCase().split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
};

// Generate a 6-digit OTP
exports.generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate a token with a payload and time-to-live (ttl)
exports.generateToken = (payload, ttl) => {
    const expiresIn = typeof ttl === 'string' ? ttl : ms(ttl);
    return jwt.sign(payload, SECRET_KEY, { expiresIn, algorithm: 'HS256' });
};

// Verify a token and return a result object
exports.verifyToken = (token) => {
    return new Promise((resolve) => {
        jwt.verify(token, SECRET_KEY, (err, decoded) => {
            resolve(err ? { valid: false, error: err } : { valid: true, decoded });
        });
    });
};

// Generate a password
exports.generatePassword = (length = 8) => {
    if (length < 8) throw new Error("Password length must be at least 8 characters.");
    
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const specials = "!@#$%^&*()_+[]{}|;:',.<>?/";
    const allChars = upper + lower + numbers + specials;
    
    let password = upper[Math.floor(Math.random() * upper.length)] +
                   lower[Math.floor(Math.random() * lower.length)] +
                   numbers[Math.floor(Math.random() * numbers.length)] +
                   specials[Math.floor(Math.random() * specials.length)];
    
    while (password.length < length) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    return password.split('').sort(() => 0.5 - Math.random()).join('');
};

// Generate alphanumeric code
exports.generateAlphanumericCode = (num = 6) => {
    let code = "";
    while (code.length < num) {
        code += Math.random().toString(36).substring(2);
    }
    return code.substring(0, num).toUpperCase();
};

// Hash password
exports.hashPassword = async (password, salt = 10) => {
    return await bcrypt.hash(password, salt);
};

// Compare password
exports.comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

// Convert USD to NGN using ExchangeRate-API
const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY;
exports.convertUsdToNgn = async (amountInUsd) => {
    try {
        const response = await axios.get(`https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/USD`);
        const exchangeRate = response.data.conversion_rates.NGN;
        if (!exchangeRate) throw new Error("Unable to fetch NGN exchange rate.");
        return amountInUsd * exchangeRate;
    } catch (error) {
        console.error("Error converting USD to NGN:", error);
        throw new Error("Failed to convert currency.");
    }
};
