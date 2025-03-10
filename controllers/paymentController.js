const { PaymentService, TransactionService, WalletService } = require('../services/paymentServices');
const Transaction = require('../models/transactionModel');
const User = require("../models/Users");


const initiateCheckout = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({ message: "User not logged in" });
    }
    const { amount, currency, paymentGateway, paymentType } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const paymentData = {
      gateway: paymentGateway,
      amount,
      currency,
      paymentType,
      userEmail: user.email,
    };

    const paymentServices = new PaymentService();

    const checkoutResponse = await paymentServices.createHostedCheckoutSession(paymentData);

    const transaction = new Transaction({
      userId,
      email: user.email,
      amount,
      currency,
      method: paymentGateway,
      paymentType,
      status: 'pending',
      reference: checkoutResponse.reference,
    });
    await transaction.save();

    return res.json({
      checkoutUrl: checkoutResponse.checkoutUrl,
      reference: checkoutResponse.reference,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

const getWalletBalance = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({ message: "User not logged in" });
    }

    const walletBalance = await WalletService.getWalletById(userId);
    if (!walletBalance) return res.status(404).json({ message: "Wallet not found" });

    return res.status(200).json({ balance: walletBalance.balance });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

const getWalletDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({ message: "User not logged in" });
    }

    const wallet = await WalletService.getWalletById(userId);
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    return res.status(200).json({ details: wallet });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

const getAllWallet = async (req, res) => {
  try {
    const wallets = await WalletService.getWallets();
    if (!wallets) return res.status(404).json({ message: "Wallets not found" });

    return res.status(200).json({ details: wallets });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

const getTransactionHistoryOfUser = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({ message: "User not logged in" });
    }

    const transactionHistory = await TransactionService.getTransactions({ userId });
    if (!transactionHistory) return res.status(404).json({ message: "Transactions not found" });

    return res.status(200).json({
      message: "Transaction history fetched successfully!",
      data: transactionHistory,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

const getTransactionHistories = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({ message: "User not logged in" });
    }

    const transactionHistory = await TransactionService.getTransactions();
    if (!transactionHistory) return res.status(404).json({ message: "Transactions not found" });

    return res.status(200).json({
      message: "Transaction history fetched successfully!",
      data: transactionHistory,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

module.exports = {
  initiateCheckout,
  getWalletBalance,
  getWalletDetails,
  getAllWallet,
  getTransactionHistoryOfUser,
  getTransactionHistories,
};
