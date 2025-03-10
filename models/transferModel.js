const mongoose = require("mongoose");


const TransferSchema = new mongoose.Schema(
  {
    userId: { 
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
        required: true 
    },
    recipient_name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true 
    },
    reference: { 
        type: String, 
        unique: true, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ["pending", "successful", "failed"], 
        default: "pending" 
    },
  },
  { timestamps: true }
);

const transferModel = mongoose.model("Transfer", TransferSchema);
module.exports = transferModel;