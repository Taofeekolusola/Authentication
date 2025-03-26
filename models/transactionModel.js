const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
        type: String,
    },
    amount: { 
        type: Number, 
        required: true 
    },
    currency: { 
        type: String, 
        required: true 
    },
    method: {
      type: String,
      enum: ["flutterwave", "paypal", "stripe", "wise", "stripe-connect", "stripe-bank"],
      required: true,
    },
    paymentType: {
        type: String,
    },
    status: {
      type: String,
      enum: ["pending", "successful", "failed"],
      default: "pending",
    },
    reference: { 
        type: String, 
        unique: true 
    },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", TransactionSchema);

module.exports = Transaction;
