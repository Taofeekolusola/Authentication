const express = require("express");
const { 
    initiateCheckout, 
    getWalletBalance,
    getWalletDetails,
    getAllWallet,
    getTransactionHistoryOfUser,
    getTransactionHistories
} = require("../controllers/paymentController");
const { validation } = require("../middleware/auth");

const router = express.Router();

// Endpoint to fund wallet
router.post("/pay", validation, initiateCheckout);

// Endpoint to get wallet balance 
router.get("/wallet-balance", validation, getWalletBalance);

//Endpoint to get wallet details
router.get("/wallet", validation, getWalletDetails);

// Endpoint to get all wallet details by an Admin
router.get("/wallets", validation, getAllWallet);

// Endpoint to get transaction details for a particular user
router.get("/transactions", validation, getTransactionHistoryOfUser);

// Endpoint to all transactions by an Admin
router.get("/all-transactions", validation, getTransactionHistories);


module.exports = router;
