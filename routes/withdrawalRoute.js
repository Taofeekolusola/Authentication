const express = require('express');
const { handleWithdrawal, temporaryAddWalletBalance, testExchangeRate } = require('../controllers/withdrawalController');
const { validation } = require("../middleware/auth");

const router = express.Router();

// Endpoint to withdraw from wallet balance 
router.post("/withdraw", validation, handleWithdrawal);

// Endpoint to temporary add wallet balance 
router.post("/add-balance", validation, temporaryAddWalletBalance);

// Endpoint to test exchange rate
router.post("/exchange-rate", testExchangeRate);


module.exports = router;
