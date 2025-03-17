const Stripe = require("stripe");
const Transaction = require("../models/transactionModel");
const transferModel = require("../models/transferModel");
const notificationModel = require("../models/notificationModel");
const { sendEmailNotification } = require("../utils/emailHandler/emailNotification");
const { generateEmailTemplate } = require("../utils/emailHandler/notificationMail");
const { Wallet } = require("../models/walletModel");
const { User } = require("../models/Users");
const { convertUsdToNgn } = require("../helpers/helpers");


// Environment variables for signatures and secrets
const FLW_SECRET_HASH = process.env.FLW_SECRET_HASH;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const WISE_SECRET_HASH = process.env.WISE_SECRET_HASH;

// Initialize Stripe SDK
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-01-27.acacia' });


/**
 * Unified webhook handler that determines the source gateway based on headers/payload.
 */
exports.unifiedWebhookHandler = async (req, res) => {
  try {
    // Determine the gateway by inspecting headers or payload properties
    if (req.headers["verif-hash"]) {
      // Assume Flutterwave if "verif-hash" header is present
      return await handleFlutterwaveWebhook(req, res);
    } else if (req.headers["stripe-signature"]) {
      // Assume Stripe if "stripe-signature" header exists
      return await handleStripeWebhook(req, res);
    } else if (req.headers["wise-signature"]) {
      // Assume Wise if "wise-signature" header exists
      return await handleWiseWebhook(req, res);
    } else if (req.body && req.body.event_type && req.body.resource) {
      // Assume PayPal if payload contains event_type and a resource object
      return await handlePaypalWebhook(req, res);
    } else {
      return res.status(400).json({ status: "error", message: "Unable to determine payment gateway" });
    }
  } catch (error) {
    console.error("Error in unified webhook handler:", error.message);
    return res.status(500).json({ status: "error", message: "Internal Server Error: " + error.message });
  }
};

/**
 * Flutterwave webhook handler.
 */
const handleFlutterwaveWebhook = async (req, res) => {
  const flutterwaveSignature = req.headers["verif-hash"];
  if (!FLW_SECRET_HASH) {
    throw new Error("FLW_SECRET_HASH is not set in environment variables");
  }
  if (flutterwaveSignature !== FLW_SECRET_HASH) {
    return res.status(401).json({ status: "error", message: "Invalid Flutterwave webhook signature" });
  }
  const event = req.body;
  if (!event.data || !event.data.tx_ref) {
    return res.status(400).json({ status: "error", message: "Invalid Flutterwave payload: missing tx_ref" });
  }
  const txRef = event.data.tx_ref;
  console.log(`Handling Flutterwave event: ${event.event} for tx_ref: ${txRef}`);

  // Prevent duplicate processing
  const existingPayment = await Transaction.findOne({ reference: txRef, status: "successful" });
  if (existingPayment) {
    console.log(`Flutterwave event already processed for tx_ref: ${txRef}`);
    return res.status(200).json({ message: "Event already processed" });
  }

  // Route event based on type
  switch (event.event) {
    case "charge.completed":
      await handleChargeSuccess(event.data, "Flutterwave");
      break;
    case "charge.failed":
      await handleChargeFailed(event.data, "Flutterwave");
      break;
    case "transfer.completed":
      await handleTransferSuccess(event.data, "Flutterwave");
      break;
    case "transfer.failed":
      await handleTransferFailed(event.data, "Flutterwave");
      break;
    default:
      console.log(`Unhandled Flutterwave event: ${event.event}`);
      return res.status(200).json({ status: "success", message: "Event unhandled" });
  }
  return res.status(200).json({ status: "success", message: "Flutterwave webhook processed successfully" });
};

const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  // Ensure the webhook secret is set
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("Stripe webhook secret is not set.");
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }

  let event;

  // Access the raw body
  const rawBody = req.rawBody;

  // Check if rawBody is a buffer
  if (!Buffer.isBuffer(rawBody)) {
    console.error("Raw body is not a buffer");
    return res.status(400).send({ error: "Raw body is not a buffer" });
  }

  try {
    // Use the raw request body for signature verification
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Process the event
  const object = event.data.object;
  const reference = object.id;
  console.log(`Handling Stripe event: ${event.type} for reference: ${reference}`);

  // Prevent duplicate processing
  const existingTransaction = await Transaction.findOne({ reference, status: "successful" });
  if (existingTransaction) {
    console.log(`Stripe event already processed for reference: ${reference}`);
    return res.status(200).json({ message: "Event already processed" });
  }

  // Handle specific event types
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.payment_status === "paid") {
      await handleChargeSuccess({ tx_ref: reference }, "Stripe");
    }
  } else if (event.type === "payment_intent.payment_failed") {
    await handleChargeFailed({ tx_ref: reference }, "Stripe");
  } else {
    console.log(`Unhandled Stripe event type: ${event.type}`);
    return res.status(200).json({ message: "Unhandled event type" });
  }

  return res.status(200).json({ received: true });
};

/**
 * PayPal webhook handler.
 */
const handlePaypalWebhook = async (req, res) => {
  const event = req.body;
  const eventType = event.event_type;
  const reference = event.resource?.id;
  if (!reference) {
    return res.status(400).json({ status: "error", message: "Missing PayPal resource id" });
  }
  console.log(`Handling PayPal event: ${eventType} for reference: ${reference}`);

  const existingTransaction = await Transaction.findOne({ reference, status: "successful" });
  if (existingTransaction) {
    console.log(`PayPal event already processed for reference: ${reference}`);
    return res.status(200).json({ message: "Event already processed" });
  }

  if (eventType === "CHECKOUT.ORDER.APPROVED" || eventType === "PAYMENT.CAPTURE.COMPLETED") {
    await handleChargeSuccess({ tx_ref: reference }, "PayPal");
  } else if (eventType === "PAYMENT.CAPTURE.DENIED" || eventType === "PAYMENT.CAPTURE.FAILED") {
    await handleChargeFailed({ tx_ref: reference }, "PayPal");
  } else {
    console.log(`Unhandled PayPal event type: ${eventType}`);
    return res.status(200).json({ status: "success", message: "Event unhandled" });
  }
  return res.status(200).json({ status: "success", message: "PayPal webhook processed" });
};

/**
 * Wise webhook handler.
 */
const handleWiseWebhook = async (req, res) => {
  const wiseSignature = req.headers["wise-signature"];
  if (!WISE_SECRET_HASH) {
    throw new Error("WISE_SECRET_HASH is not set in environment variables");
  }
  if (wiseSignature !== WISE_SECRET_HASH) {
    return res.status(401).json({ status: "error", message: "Invalid Wise webhook signature" });
  }
  const event = req.body;
  if (!event || !event.reference) {
    return res.status(400).json({ status: "error", message: "Invalid Wise webhook payload: missing reference" });
  }
  const reference = event.reference;
  console.log(`Handling Wise event for reference: ${reference}`);

  const existingTransaction = await Transaction.findOne({ reference, status: "successful" });
  if (existingTransaction) {
    console.log(`Wise event already processed for reference: ${reference}`);
    return res.status(200).json({ message: "Event already processed" });
  }

  if (event.status === "completed") {
    await handleChargeSuccess({ tx_ref: reference }, "Wise");
  } else if (event.status === "failed") {
    await handleChargeFailed({ tx_ref: reference }, "Wise");
  } else {
    console.log(`Unhandled Wise event status: ${event.status}`);
    return res.status(200).json({ status: "success", message: "Event unhandled" });
  }
  return res.status(200).json({ received: true });
};

// ---------------------------------------------------
// Unified Event Handlers for Payment and Transfers
// ---------------------------------------------------

const handleChargeSuccess = async (data, gateway) => {
  console.log(`Handling charge success from ${gateway}:`, data);
  try {
    const paymentRecord = await Transaction.findOne({ reference: data.tx_ref });
    if (!paymentRecord) {
      console.error(`Payment record not found for reference: ${data.tx_ref}`);
      return;
    }
    const user = await User.findById(paymentRecord.userId);

    paymentRecord.status = "successful";
    if (user) {
      paymentRecord.email = user.email;
    } else {
      console.error("User not found for payment record");
    }
    // if (gateway === "Flutterwave") {
    //   paymentRecord.flw_ref = (data as any).flw_ref;
    // }
    // paymentRecord.transactionId = data.id;
    await paymentRecord.save();

    let amount = paymentRecord.amount;

    // Update the user's wallet balance and add the transaction
    const wallet = await Wallet.findOne({ userId: paymentRecord.userId });
    if (wallet) {
    // Convert USD to NGN if the gateway is Stripe
    if (gateway === "Stripe") {
      try {
        amount = await convertUsdToNgn(amount); // Wait for the conversion to complete
        console.log(`Amount in NGN: ${amount}`);
      } catch (error) {
        console.error("Error converting USD to NGN:", error);
      }
    }

      wallet.balance += amount;
      wallet.transactions.push(paymentRecord._id);
      await wallet.save();
    } else {
      await Wallet.create({
        userId: paymentRecord.userId,
        balance: amount,
        transactions:[paymentRecord._id],
        email: paymentRecord.email,
        role: "taskCreator",
      })
    }

    const emailBody = `Payment of ${paymentRecord.amount} ${paymentRecord.currency} was successful. Reference: ${paymentRecord.reference}. \n\n AltBucks`;
    const recipient = paymentRecord.email;
    if (recipient && typeof recipient === "string") {
      const emailHTML = generateEmailTemplate({
        subject: "Payment Successful",
        name: recipient,
        body: emailBody,
      });
      await sendEmailNotification(recipient, "Payment Successful", emailHTML);
      await notificationModel.create({
        email: paymentRecord.email,
        subject: "Payment Successful",
        message: emailBody,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
      });
    }
    console.log("Charge success event processed successfully.");
  } catch (err) {
    console.error("Error processing charge success event:", err.message);
  }
};

/**
 * Handles failed charge events.
 */
const handleChargeFailed = async (data, gateway) => {
  console.log(`Handling charge failed from ${gateway}:`, data);
  try {
    const paymentRecord = await Transaction.findOne({ reference: data.tx_ref });
    if (!paymentRecord) {
      console.error(`Payment record not found for reference: ${data.tx_ref}`);
      return;
    }
    paymentRecord.status = "failed";
    await paymentRecord.save();

    const emailBody = `Payment of ${paymentRecord.amount} ${paymentRecord.currency} failed. Reference: ${paymentRecord.reference}. \n\n AltBucks`;
    const recipient = paymentRecord.email;
    if (recipient && typeof recipient === "string") {
      const emailHTML = generateEmailTemplate({
        subject: "Payment Failed",
        name: recipient,
        body: emailBody,
      });
      await sendEmailNotification(recipient, "Payment Failed", emailHTML);
      await notificationModel.create({
        email: paymentRecord.email,
        subject: "Payment Failed",
        message: emailBody,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
      });
    }
    console.log("Charge failed event processed successfully.");
  } catch (err) {
    console.error("Error processing charge failed event:", err.message);
  }
};

const handleTransferSuccess = async (data, gateway) => {
  console.log(`Handling transfer success from ${gateway}:`, data);
  try {
    const transferRecord = await transferModel.findOne({ reference: data.tx_ref });
    if (!transferRecord) {
      console.error(`Transfer record not found for reference: ${data.tx_ref}`);
      return;
    }
    transferRecord.status = "successful";
    await transferRecord.save();

    // Update the user's wallet balance and add the transaction
    const wallet = await Wallet.findOne({ userId: transferRecord.userId });
    if (wallet) {
      wallet.balance -= transferRecord.amount; // Deduct the amount for transfers
      wallet.transactions.push(transferRecord._id);
      await wallet.save();
    }

    const emailBody = `Transfer of ${transferRecord.amount} ${transferRecord.currency} to ${transferRecord.recipient_name} was successful. Reference: ${transferRecord.reference}. \n\n Your Team`;
    const recipient = transferRecord.email;
    if (recipient && typeof recipient === "string") {
      const emailHTML = generateEmailTemplate({
        subject: "Transfer Successful",
        name: recipient,
        body: emailBody,
      });
      await sendEmailNotification(recipient, "Transfer Successful", emailHTML);
      await notificationModel.create({
        email: transferRecord.email,
        subject: "Transfer Successful",
        message: emailBody,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
      });
    }
    console.log("Transfer success event processed successfully.");
  } catch (err) {
    console.error("Error processing transfer success event:", err.message);
  }
};

/**
 * Handles failed transfer events.
 */
const handleTransferFailed = async (data, gateway) => {
  console.log(`Handling transfer failed from ${gateway}:`, data);
  try {
    const transferRecord = await transferModel.findOne({ reference: data.tx_ref });
    if (!transferRecord) {
      console.error(`Transfer record not found for reference: ${data.tx_ref}`);
      return;
    }
    transferRecord.status = "failed";
    await transferRecord.save();

    const emailBody = `Transfer of ${transferRecord.amount} ${transferRecord.currency} to ${transferRecord.recipient_name} failed. Reference: ${transferRecord.reference}. \n\n Your Team`;
    const recipient = transferRecord.email;
    if (recipient && typeof recipient === "string") {
      const emailHTML = generateEmailTemplate({
        subject: "Transfer Failed",
        name: recipient,
        body: emailBody,
      });
      await sendEmailNotification(recipient, "Transfer Failed", emailHTML);
      await notificationModel.create({
        email: transferRecord.email,
        subject: "Transfer Failed",
        message: emailBody,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
      });
    }
    console.log("Transfer failed event processed successfully.");
  } catch (err) {
    console.error("Error processing transfer failed event:", err.message);
  }
};


