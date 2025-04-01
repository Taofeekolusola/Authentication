const express = require("express");
const { 
    initiateCheckout, 
    getWalletBalance,
    getWalletDetails,
    getAllWallet,
    getTransactionHistoryOfUser,
    getTransactionHistories,
    addPaymentMethod,
    getPaymentMethods,
    updatePaymentMethod,
    deletePaymentMethod,
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

// Endpoint to add a payment method
router.post("/payment-details", validation, addPaymentMethod);

// Endpoint to get all payment methods for a user
router.get("/payment-details", validation, getPaymentMethods);

// Endpoint to update a payment method for a user
router.put("/payment-details/:paymentMethodId", validation, updatePaymentMethod);

// Endpoint to delete a payment method for a user
router.delete("/payment-details/:paymentMethodId", validation, deletePaymentMethod);


module.exports = router;
