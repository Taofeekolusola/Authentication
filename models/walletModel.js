const mongoose = require("mongoose");

const WalletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
        type: String,
    },
    role: {
        type: String,
        enum: ["taskEarner", "taskCreator"],
    },
    balance: {
        type: Number,
        default: 0,
    },
    currency: {
        type: String,
        default: "NGN",
    },
    transactions: [{
        type: mongoose.Types.ObjectId,
        ref: "Transaction"
    }],
  },
  { timestamps: true }
);
    

const Wallet = mongoose.model("Wallet", WalletSchema);
module.exports = Wallet;