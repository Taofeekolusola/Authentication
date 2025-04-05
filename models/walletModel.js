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





const reserveWalletSchema = new mongoose.Schema({
  taskId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Task", 
    required: true 
  },
  taskCreatorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    default: "NGN",
  },
}, { timestamps: true  });


const ReserveWallet = mongoose.model("ReserveWallet", reserveWalletSchema);

module.exports = { Wallet, ReserveWallet};
