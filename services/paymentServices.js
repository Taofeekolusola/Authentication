const axios = require("axios");
const Stripe = require('stripe');
const paypal = require('@paypal/checkout-server-sdk');
const dotenv = require("dotenv");
const Transaction = require("../models/transactionModel");
const Wallet = require("../models/walletModel");
dotenv.config();


class PaymentService {
  constructor() {
    this.flutterwaveAPI = axios.create({
      baseURL: "https://api.flutterwave.com/v3",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.FLW_SECRET_KEY}`
      }
    });

    // Initialize Stripe SDK
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27.acacia',
    });

    // Initialize PayPal SDK (using the Sandbox environment for testing)
    const environment = new paypal.core.SandboxEnvironment(
      process.env.PAYPAL_CLIENT_ID,
      process.env.PAYPAL_CLIENT_SECRET
    );
    this.paypalClient = new paypal.core.PayPalHttpClient(environment);

    this.wiseAPI = axios.create({
      // baseURL: "https://api.wise.com/v1",
      baseURL: "https://api.sandbox.transferwise.tech/v1", // Use Wise Sandbox API
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.WISE_API_KEY}`
      }
    });
  }

  /**
   * Creates a hosted checkout session.
   * For gateways that support it (Flutterwave, Stripe, PayPal), we use their SDK.
   * For Wise (or similar), we simulate a hosted checkout URL.
   */
  async createHostedCheckoutSession(paymentData) {
    switch (paymentData.gateway) {
      case 'flutterwave': {
        const txRef = `FLW_${Date.now()}-altB`;
        const payload = {
          tx_ref: txRef,
          amount: paymentData.amount,
          currency: paymentData.currency,
          redirect_url: `${process.env.FRONTEND_URL}/dashboard/my_wallet?ref=${txRef}`,
        //   payment_options: paymentData.paymentType,
          customer: {
            email: paymentData.userEmail,
          },
        };
        // Directly call the Flutterwave API endpoint for initiating a charge.
      const response = await this.flutterwaveAPI.post("/payments", payload);
      console.log("Flutterwave API response:", response.data);
      
      // Extract the checkout URL from the response. Adjust field names based on the actual API response.
      const checkoutUrl = response.data.data.link || `https://flutterwave.com/pay/${txRef}`;
      return { checkoutUrl, reference: txRef };
      }
      case 'stripe': {
        const session = await this.stripe.checkout.sessions.create({
        //   payment_method_types: ['card'], // Adjust if bank transfers are supported
          line_items: [
            {
              price_data: {
                currency: paymentData.currency,
                product_data: { name: 'Wallet Funding' },
                unit_amount: Math.round(paymentData.amount * 100), // amount in cents
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `${process.env.FRONTEND_URL}/dashboard/my_wallet?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.FRONTEND_URL}/login`,
        });
        return { checkoutUrl: session.url, reference: session.id };
      }
      case 'paypal': {
        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: paymentData.currency,
                value: paymentData.amount.toString(),
              },
            },
          ],
          application_context: {
            return_url: `${process.env.FRONTEND_URL}/dashboard/my_wallet`,
            cancel_url: `${process.env.FRONTEND_URL}/login`,
          },
        });
        const order = await this.paypalClient.execute(request);
        // Find the approval link from the response
        const approvalUrl = order.result.links.find((link) => link.rel === 'approve').href;
        return { checkoutUrl: approvalUrl, reference: order.result.id };
      }
      case 'wise': {
        // Step 1: Create a quote (include profile if required)
        const quotePayload = {
          sourceAmount: paymentData.amount,
          sourceCurrency: paymentData.currency,
          targetCurrency: "USD",
          profile: process.env.WISE_PROFILE_ID, 
        };
      
        const quoteResponse = await this.wiseAPI.post("/quotes", quotePayload);
        const quoteId = quoteResponse.data.id;
        console.log("Quote Response:", quoteResponse.data);
      
        // Step 2: Create a payment link with redirect URLs for success and cancel
        const paymentLinkPayload = {
          quoteId: quoteId,
          description: "Fund wallet",
          redirect_url: `${process.env.FRONTEND_URL}/dashboard/my_wallet?ref=${quoteId}`, // Success URL
          cancel_url: `${process.env.FRONTEND_URL}/login`, // Cancel/failure URL
        };
      
        const paymentLinkResponse = await this.wiseAPI.post("/payment-links", paymentLinkPayload);
        const paymentLink = paymentLinkResponse.data.url;
        console.log("Payment Link Response:", paymentLinkResponse.data);
      
        // Return the checkout URL and reference (quote ID)
        return { checkoutUrl: paymentLink, reference: quoteId };
      }      
      default:
        throw new Error('Invalid payment gateway selected');
    }
  }

}


class TransactionService {

  // Get all Transactions, sorted by creation date (newest first).
  static async getTransactions(filter = {}) {
    return Transaction.find(filter).sort({ createdAt: -1 })
    .populate({
      path: "userId",
      model: "User",
      select: "firstName lastName email phoneNumber userImageUrl",
      });
  }

  // Find a Transaction by a given field, e.g., { name: "Eben" }
  static async getTransactionByField(query) {
    return Transaction.findOne(query)
    .populate({
      path: "userId",
      model: "User",
      select: "firstName lastName email phoneNumber userImageUrl",
      });
  }

  // Find a Transaction by ID
  static async getTransactionById(id) {
    return Transaction.findById(id)
    .populate({
      path: "userId",
      model: "User",
      select: "firstName lastName email phoneNumber userImageUrl",
      });
  }

  // Delete a Transaction by their ID.
  static async deleteTransactionById(id) {
    return Transaction.findOneAndDelete({ _id: id });
  }

}


class WalletService {
  // Get all Wallets, sorted by creation date (newest first).
  static getWallets() {
    return Wallet.find().sort({ createdAt: -1 })
    .populate({
      path: "transactions",
      model: "Transaction",
      })
    .populate({
      path: "userId",
      model: "User",
      select: "firstName lastName email phoneNumber userImageUrl",
      });
  }

  // Find a Wallet by a given field, e.g., { name: "Eben" }.
  static getWalletByField(query) {
    return Wallet.findOne(query)
    .populate({
      path: "transactions",
      model: "Transaction",
      })
    .populate({
      path: "userId",
      model: "User",
      select: "firstName lastName email phoneNumber userImageUrl",
      });;
  }

  // Find a Wallet by ID.
  static getWalletById(id) {
    return Wallet.findById(id)
    .populate({
      path: "transactions",
      model: "Transaction",
      })
    .populate({
      path: "userId",
      model: "User",
      select: "firstName lastName email phoneNumber userImageUrl",
      });;
  }

  // Delete a Wallet by their ID.
  static deleteWalletById(id) {
    return Wallet.findOneAndDelete({ _id: id });
  }
}

// export new PaymentService();


const paymentGatewayCurrencies = {
  flutterwave: {ngn: 'NGN', ghs: 'GHS', zar: 'ZAR', usd: 'USD', eur: 'EUR', gbp: 'GBP'},
  stripe: {usd: 'USD', eur: 'EUR', gbp: 'GBP', aud: 'AUD', cad: 'CAD'},
  wise: {usd: 'USD', eur: 'EUR', gbp: 'GBP', ngn: 'NGN'},
  paypal: {usd: 'USD', eur: 'EUR', gbp: 'GBP', aud: 'AUD', cad: 'CAD'}
};


module.exports = { PaymentService, TransactionService, WalletService, paymentGatewayCurrencies };