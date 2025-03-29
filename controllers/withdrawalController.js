const {  WithdrawalService, TransactionService, WalletService, verifyBankAccount } = require("../services/paymentServices");
const Transaction = require("../models/transactionModel");
const User = require("../models/Users");
const { convertUsdToNgn } = require("../helpers/helpers");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); // Load Stripe API..

// Define allowed gateways and required recipient details
const PAYMENT_GATEWAYS = {
  "flutterwave": { requiredFields: ["bankCode", "accountNumber"] },
  "paypal": { requiredFields: ["paypalEmail"] },
  "wise": { 
    requiredFieldsByCurrency: {
      "NGN": ["accountHolderName", "accountNumber", "bankCode"], // Nigerian banks use bank code
      "USD": ["accountHolderName", "accountNumber", "routingNumber"], // U.S. banks use routing number
      "GBP": ["accountHolderName", "accountNumber", "sortCode"], // UK banks use sort code
      "EUR": ["accountHolderName", "accountNumber", "IBAN"], // European banks use IBAN
    },
    alternativeFields: ["recipientId"] // Allows Wise Recipient ID instead
  },
  "stripe-connect": { requiredFields: ["stripeAccountId"] }, // Stripe Connect Payout
  "stripe-bank": { requiredFields: ["accountNumber", "routingNumber", "accountHolderName"] } // Direct U.S. Bank Payout
};

const withdrawalService = new WithdrawalService();



const handleWithdrawal = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    // Extract request body
    const { gateway, amount, currency, recipientDetails } = req.body;

    // Validate required fields
    if (!gateway || !amount || !currency || !recipientDetails) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Validate payment gateway
    if (!PAYMENT_GATEWAYS[gateway]) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid payment gateway. Supported: Flutterwave, PayPal, Wise, Stripe-Connect, Stripe-Bank" 
      });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid withdrawal amount!" });
    }

    // Handle Wise gateway separately (supports multiple field types)
    if (gateway === "wise") {
      const requiredWiseFields = PAYMENT_GATEWAYS[gateway].requiredFieldsByRegion || [];
      const hasBankDetails = requiredWiseFields.every(field => recipientDetails[field]);
      const hasRecipientId = recipientDetails.recipientId;

      if (!hasBankDetails && !hasRecipientId) {
        return res.status(400).json({
          success: false,
          message: `Wise withdrawal requires either a recipientId or full bank details: ${requiredWiseFields.join(", ")}`
        });
      }
    } else {
      // Validate recipient details based on the selected gateway
      const requiredFields = PAYMENT_GATEWAYS[gateway].requiredFields;
      for (const field of requiredFields) {
        if (!recipientDetails[field]) {
          return res.status(400).json({
            success: false,
            message: `Missing required field: ${field} for ${gateway}`
          });
        }
      }
    }

    // Additional validation for bank withdrawals (Flutterwave)
    if (gateway === "flutterwave") {
      const { bankCode, accountNumber } = recipientDetails;
      const verifiedAccount = await verifyBankAccount(bankCode, accountNumber);
      if (verifiedAccount.status !== "success") {
        return res.status(400).json({ success: false, message: "Invalid bank account details" });
      }
    }

    // Fetch user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Check user's wallet balance
    const wallet = await WalletService.getWalletByField({ userId });
    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ success: false, message: "Insufficient wallet balance!" });
    }

    
    // Convert USD to NGN and Check user's wallet balance
    let newAmount;
    if (gateway === "stripe-connect" || gateway === "stripe-bank") {
      newAmount = await convertUsdToNgn(amount); // Wait for the conversion to complete
      console.log(`Amount in NGN: ${newAmount}`);
    if (!wallet || wallet.balance < newAmount) {
      return res.status(400).json({ success: false, message: "Insufficient wallet balance!" });
    }
  }

    // Process withdrawal via service
    const result = await withdrawalService.processWithdrawal({
      gateway,
      amount,
      currency,
      ...recipientDetails
    });

    console.log("Withdrawal Result:", result);

    // Create transaction record
    const transaction = new Transaction({
      userId,
      email: user.email,
      amount: amount,
      currency,
      method: gateway,
      paymentType: "withdrawal",
      status: "pending",
      reference: result.reference ?? `WDL_${Date.now()}`
    });
    await transaction.save();

    return res.status(200).json({ success: true, data: result });

  } catch (error) {
    console.error("Withdrawal Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};


// Endpoint to temporarily update the wallet balance for testing
const temporaryAddWalletBalance = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    const { amount } = req.body;
    if (!amount) return res.status(400).json({ message: "Please input the amount!" })

    if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ success: false, message: "Invalid withdrawal amount!" });
    }

    // Check user's wallet balance
    const wallet = await WalletService.getWalletByField({ userId });
    if (!wallet) {
      return res.status(400).json({ success: false, message: "Wallet not found!" });
    }

    wallet.balance += amount;
    await wallet.save();

    return res.status(200).json({ success: true, message: "Wallet balance updated successfully!", data: wallet });

  } catch (error) {
    console.error("Withdrawal Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
}


const testExchangeRate = async (req, res) => {
  try {

    const { amount } = req.body;
    if (!amount) return res.status(400).json({ message: "Please input the amount!" })

    const convertedAmount = await convertUsdToNgn(amount);
    return res.status(200).json({ success: true, convertedAmount });

  } catch (error) {
    console.error("Exchange Rate Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
}


module.exports = { handleWithdrawal, temporaryAddWalletBalance, testExchangeRate };
