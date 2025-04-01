const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    beneficiaryName: { 
        type: String, 
        required: true 
    },
    gateway: {
      type: String,
      required: true,
      enum: ["flutterwave", "paypal", "wise", "stripe-connect", "stripe-bank"],
    },
    currency: { type: String, required: false }, // Optional for gateways that don't need it
    recipientDetails: { type: Object, required: true }, // Flexible for different gateways
    country: { 
        type: String, 
    },
  },
  { timestamps: true }
);

const PaymentMethod = mongoose.model("PaymentMethod", paymentMethodSchema);
module.exports = PaymentMethod;
