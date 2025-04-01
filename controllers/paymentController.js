const { PaymentService, TransactionService, WalletService } = require('../services/paymentServices');
const Transaction = require('../models/transactionModel');
const User = require("../models/Users");
const PaymentMethod = require("../models/PaymentMethodModel");


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
      paymentType: paymentType ?? "fund",
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

    const walletBalance = await WalletService.getWalletByField({userId: userId});
    if (!walletBalance) return res.status(404).json({ message: "Wallet not found" });

    return res.status(200).json({ balance: walletBalance.balance });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// const getWalletDetails = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     if (!userId) {
//       return res.status(401).json({ message: "User not logged in" });
//     }

//     const wallet =  await WalletService.getWalletByField({userId: userId});
//     if (!wallet) return res.status(404).json({ message: "Wallet not found" });

//     let totalMoneyRecieved = 0;
//     let totalMoneyWithdrawn = 0;
//     let totalMoneySpent = 0;

//     if (req.user.isTaskEarner) {
//       totalMoneyRecieved 
//       totalMoneyWithdrawn
//     }

//     if (req.user.isTaskCreator) {
//       totalMoneyRecieved 
//       totalMoneySpent
//     }

//     return res.status(200).json({ details: wallet });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: "Internal Server Error", error: error.message });
//   }
// };

const getWalletDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({ message: "User not logged in" });
    }

    const wallet = await WalletService.getWalletByField({ userId: userId });
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    let totalMoneyReceived = 0;
    let totalMoneyWithdrawn = 0;
    let totalMoneySpent = 0;

    if (wallet.transactions && wallet.transactions.length > 0) {
      if (req.user.isTaskEarner) {
        totalMoneyReceived = wallet.transactions
          .filter(
            (tx) =>
              tx.method === "in-app" &&
              tx.paymentType === "credit" &&
              tx.status === "successful"
          )
          .reduce((acc, tx) => acc + tx.amount, 0);

        totalMoneyWithdrawn = wallet.transactions
          .filter(
            (tx) =>
              tx.paymentType === "withdrawal" && tx.status === "successful"
          )
          .reduce((acc, tx) => acc + tx.amount, 0);
      }

      if (req.user.isTaskCreator) {
        totalMoneyReceived = wallet.transactions
          .filter(
            (tx) =>
              tx.paymentType === "fund" && tx.status === "successful"
          )
          .reduce((acc, tx) => acc + tx.amount, 0);

        totalMoneySpent = wallet.transactions
          .filter(
            (tx) =>
              tx.method === "in-app" &&
              tx.paymentType === "debit" &&
              tx.status === "successful"
          )
          .reduce((acc, tx) => acc + tx.amount, 0);
      }
    }

    return res.status(200).json({
      details: wallet,
      totalMoneyReceived,
      totalMoneyWithdrawn,
      totalMoneySpent,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
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


// Function to add Payment / Withdrawal Methods Details
const addPaymentMethod = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({ message: "User not logged in" });
    }

    const { gateway, currency, recipientDetails, country } = req.body;

    const PAYMENT_GATEWAYS = {
      "flutterwave": { requiredFields: ["bankCode", "accountNumber"] },
      "paypal": { requiredFields: ["paypalEmail"] },
      "wise": { 
        requiredFieldsByCurrency: {
          "NGN": ["accountHolderName", "accountNumber", "bankCode"],
          "USD": ["accountHolderName", "accountNumber", "routingNumber"],
          "GBP": ["accountHolderName", "accountNumber", "sortCode"],
          "EUR": ["accountHolderName", "accountNumber", "IBAN"],
        },
        alternativeFields: ["recipientId"]
      },
      "stripe-connect": { requiredFields: ["stripeAccountId"] },
      "stripe-bank": { requiredFields: ["accountHolderName", "accountNumber", "routingNumber"] }
    };

    // Validate gateway
    if (!PAYMENT_GATEWAYS[gateway]) {
      return res.status(400).json({ message: "Invalid payment gateway" });
    }

    const gatewayConfig = PAYMENT_GATEWAYS[gateway];
    let requiredFields = gatewayConfig.requiredFields || [];

    // Special case for Wise (currency-based fields or recipientId)
    if (gateway === "wise") {
      requiredFields = gatewayConfig.requiredFieldsByCurrency[currency] || [];
      const hasAlternative = recipientDetails.recipientId;
      const hasRequiredFields = requiredFields.every(field => recipientDetails[field]);

      if (!hasAlternative && !hasRequiredFields) {
        return res.status(400).json({ message: `Missing required recipient details for ${currency}.` });
      }
    } else {
      if (!requiredFields.every(field => recipientDetails[field])) {
        return res.status(400).json({ message: `Missing required recipient details for ${gateway}.` });
      }
    }

    // Check if the same payment details already exist for this user
    const existingPayment = await PaymentMethod.findOne({
      userId,
      gateway,
      "recipientDetails.accountNumber": recipientDetails.accountNumber,
    });
    
    if (existingPayment) {
      return res.status(400).json({ message: "You have already added this payment method!" });
    }

    // Create a new PaymentMethod document
    const newPaymentMethod = new PaymentMethod({
      userId,
      beneficiaryName: `${req.user.firstName} ${req.user.lastName}`,
      gateway,
      currency,
      recipientDetails,
      country,
    });

    await newPaymentMethod.save();

    return res.status(201).json({
      success: true,
      message: "Payment method added successfully",
      paymentMethod: newPaymentMethod,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};


// Function to Fetch Payment / Withdrawal Methods Details for a User
const getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({ message: "User not logged in" });
    }

    // Fetch all payment methods for the logged-in user
    const paymentMethods = await PaymentMethod.find({ userId }).sort({ createdAt: -1 });

    if (paymentMethods.length === 0) {
      return res.status(404).json({ message: "No payment methods found for this user" });
    }

    return res.status(200).json({
      success: true,
      message: "Payment methods fetched successfully",
      paymentMethods,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};


// // Function to Update Payment / Withdrawal Methods Details for a User
// const updatePaymentMethod = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     if (!userId) {
//       return res.status(401).json({ message: "User not logged in" });
//     }

//     const { gateway, currency, recipientDetails, country } = req.body;
//     const paymentMethodId = req.params.paymentMethodId;

//     // Find the payment method to update
//     const paymentMethod = await PaymentMethod.findOne({ userId, _id: paymentMethodId });

//     if (!paymentMethod) {
//       return res.status(404).json({ message: "Payment method not found" });
//     }

//     // Only update fields that are present in the request body
//     if (gateway) paymentMethod.gateway = gateway;
//     if (currency) paymentMethod.currency = currency;
//     if (country) paymentMethod.country = country;
//     if (recipientDetails) {
//       // Merge the updated recipient details with the existing ones, preserving the ones not provided
//       paymentMethod.recipientDetails = {
//         ...paymentMethod.recipientDetails,
//         ...recipientDetails, // Only fields in recipientDetails provided by the user will be updated
//       };
//     }

//     // Save the updated payment method
//     await paymentMethod.save();

//     return res.status(200).json({
//       success: true,
//       message: "Payment method updated successfully",
//       paymentMethod,
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: "Internal Server Error", error: error.message });
//   }
// };


// Function to Update Payment / Withdrawal Methods Details for a User
const updatePaymentMethod = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({ message: "User not logged in" });
    }

    const { gateway, currency, recipientDetails, country } = req.body;
    const paymentMethodId = req.params.paymentMethodId;

    const paymentMethod = await PaymentMethod.findById(paymentMethodId);
    if (!paymentMethod) return res.status(404).json({ message: "Payment method not found" });

    // Initialize the updatedData object
    const updatedData = {
      gateway: gateway ?? paymentMethod.gateway,
      currency: currency ?? paymentMethod.currency,
      country: country ?? paymentMethod.country,
      recipientDetails: { ...paymentMethod.recipientDetails }, // Start with the existing recipientDetails
    };

    // If recipientDetails are provided, update the corresponding fields
    if (recipientDetails) {
      // Loop through each key in recipientDetails and update if it's provided
      for (const key in recipientDetails) {
        if (recipientDetails[key] !== undefined) {
          updatedData.recipientDetails[key] = recipientDetails[key];
        }
      }
    }

    // Special handling for "wise" payment gateway
    if (gateway === "wise" && currency) {
      const requiredFields = PAYMENT_GATEWAYS["wise"].requiredFieldsByCurrency[currency] || [];
      // Check if all required fields are filled or we have the recipientId (for "wise")
      const hasRequiredFields = requiredFields.every(field => updatedData.recipientDetails[field] !== undefined);
      const hasAlternative = updatedData.recipientDetails.recipientId;

      if (!hasAlternative && !hasRequiredFields) {
        return res.status(400).json({ message: `Missing required recipient details for ${currency}.` });
      }
    } else {
      const requiredFields = PAYMENT_GATEWAYS[gateway]?.requiredFields || [];
      // Check if all required fields are filled
      const hasRequiredFields = requiredFields.every(field => updatedData.recipientDetails[field] !== undefined);
      if (!hasRequiredFields) {
        return res.status(400).json({ message: `Missing required recipient details for ${gateway}.` });
      }
    }

    // Find the payment method to update and return the updated document
    const updatedPaymentMethod = await PaymentMethod.findByIdAndUpdate(
      paymentMethodId,
      updatedData,
      { new: true } // Return the updated document
    );

    if (!updatedPaymentMethod) {
      return res.status(404).json({ message: "Payment method not found to update" });
    }

    return res.status(200).json({
      success: true,
      message: "Payment method updated successfully",
      paymentMethod: updatedPaymentMethod,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};



// Function to Delete Payment / Withdrawal Methods Details for a User
const deletePaymentMethod = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({ message: "User not logged in" });
    }

    const paymentMethodId = req.params.paymentMethodId;

    // Find and delete the payment method
    const deletedPaymentMethod = await PaymentMethod.findOneAndDelete({ userId, _id: paymentMethodId });

    if (!deletedPaymentMethod) {
      return res.status(404).json({ message: "Payment method not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Payment method deleted successfully",
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
  addPaymentMethod,
  getPaymentMethods,
  updatePaymentMethod,
  deletePaymentMethod,
};
