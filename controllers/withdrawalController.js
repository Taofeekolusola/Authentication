// const handleWithdrawal = async (req, res) => {
//   try {
//     const userId = req.user?._id;
//     if (!userId) {
//       return res.status(401).json({ success: false, message: "User not logged in" });
//     }

//     // Extract request body
//     const { gateway, amount, currency, recipientDetails } = req.body;

//     // Validate payment gateway
//     if (!PAYMENT_GATEWAYS[gateway]) {
//       return res.status(400).json({ 
//         success: false, 
//         message: "Invalid payment gateway. Supported: Flutterwave, PayPal, Wise, Stripe-Connect, Stripe-Bank" 
//       });
//     }

//     // Validate amount
//     if (isNaN(amount) || amount <= 0) {
//       return res.status(400).json({ 
//         success: false, 
//         message: "Amount must be a valid number greater than zero!" 
//       });
//     }

//     // Validate recipient details based on the selected gateway
//     const requiredFields = PAYMENT_GATEWAYS[gateway].requiredFields;
//     for (const field of requiredFields) {
//       if (!recipientDetails[field]) {
//         return res.status(400).json({ 
//           success: false, 
//           message: `Missing required field: ${field} for ${gateway}` 
//         });
//       }
//     }

//     // Additional validation for bank withdrawals (Flutterwave)
//     if (gateway === "flutterwave") {
//       const { bankCode, accountNumber } = recipientDetails;
//       const verifiedAccount = await verifyBankAccount(bankCode, accountNumber);
//       if (!verifiedAccount.status) {
//         return res.status(400).json({ success: false, message: "Invalid bank account details" });
//       }
//     }

//     // Fetch user
//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ success: false, message: "User not found" });

//     // Fetch user's wallet
//     const wallet = await WalletService.getWalletByField({ userId });
//     if (!wallet) return res.status(404).json({ success: false, message: "Wallet not found!" });

//     // Check for sufficient funds
//     if (wallet.balance < amount) {
//       return res.status(400).json({ 
//         success: false, 
//         message: "Insufficient wallet balance!" 
//       });
//     }

//     let result;

//     // 🔹 Handle Stripe Connect Payouts (Send money to a Stripe Connected Account)
//     if (gateway === "stripe-connect") {
//       const { stripeAccountId } = recipientDetails;
      
//       // Ensure the user has a Stripe Connect account
//       if (!stripeAccountId) {
//         return res.status(400).json({ 
//           success: false, 
//           message: "User does not have a linked Stripe Connect account." 
//         });
//       }

//       // Create Stripe transfer to connected account
//       const payout = await stripe.transfers.create({
//         amount: Math.round(amount * 100), // Convert to cents
//         currency: currency.toLowerCase(),
//         destination: stripeAccountId, // Send money to user's connected Stripe account
//         transfer_group: `withdrawal_${userId}`,
//       });

//       result = { 
//         id: payout.id, 
//         status: payout.status, 
//         reference: payout.id 
//       };
//     }

//     // 🔹 Handle Stripe Direct U.S. Bank Payouts
//     else if (gateway === "stripe-bank") {
//       const { accountNumber, routingNumber, accountHolderName } = recipientDetails;

//       // Create a Stripe bank account token
//       const bankAccount = await stripe.tokens.create({
//         bank_account: {
//           country: "US",
//           currency: currency.toLowerCase(),
//           account_holder_name: accountHolderName,
//           account_holder_type: "individual",
//           routing_number: routingNumber,
//           account_number: accountNumber,
//         },
//       });

//       // Send payout to bank account
//       const payout = await stripe.payouts.create({
//         amount: Math.round(amount * 100),
//         currency: currency.toLowerCase(),
//         method: "standard", // Can be "instant" if available
//         destination: bankAccount.id,
//       });

//       result = { 
//         id: payout.id, 
//         status: payout.status, 
//         reference: payout.id 
//       };
//     }

//     // 🔹 Handle Other Gateways (Flutterwave, PayPal, Wise)
//     else {
//       result = await withdrawalService.processWithdrawal({
//         gateway,
//         amount,
//         currency,
//         recipientDetails
//       });
//     }

//     // Create transaction record
//     const transaction = new Transaction({
//       userId,
//       email: user.email,
//       amount,
//       currency,
//       method: gateway,
//       paymentType: "withdrawal",
//       status: "pending",
//       reference: result.reference,
//     });
//     await transaction.save();

//     return res.status(200).json({ success: true, data: result });

//   } catch (error) {
//     console.error("Withdrawal Error:", error);
//     return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
//   }
// };


const {  WithdrawalService, TransactionService, WalletService, verifyBankAccount } = require("../services/paymentServices");
const Transaction = require("../models/transactionModel");
const User = require("../models/Users");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); // Load Stripe API

// Define allowed gateways and required recipient details
const PAYMENT_GATEWAYS = {
  "flutterwave": { requiredFields: ["bankCode", "accountNumber"] },
  "paypal": { requiredFields: ["paypalEmail"] },
  "wise": { requiredFields: ["recipientId"] },
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
      amount,
      currency,
      method: gateway,
      paymentType: "withdrawal",
      status: "pending",
      // reference: result.reference
      reference: `WDL_${Date.now()}` // Temporary reference
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


module.exports = { handleWithdrawal, temporaryAddWalletBalance };
