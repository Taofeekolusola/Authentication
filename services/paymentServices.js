const axios = require("axios");
const Stripe = require('stripe');
const paypal = require('@paypal/checkout-server-sdk');
const dotenv = require("dotenv");
const Transaction = require("../models/transactionModel");
const {Wallet} = require("../models/walletModel");
dotenv.config();


const FRONTEND_URL = `https://altbucks-ipat.vercel.app`;

class BasePaymentService {
  constructor() {
    this.flutterwaveAPI = axios.create({
      baseURL: "https://api.flutterwave.com/v3",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.FLW_SECRET_KEY}`
      }
    });

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27.acacia',
    });

    const environment = new paypal.core.SandboxEnvironment(
      process.env.PAYPAL_CLIENT_ID,
      process.env.PAYPAL_CLIENT_SECRET
    );
    this.paypalClient = new paypal.core.PayPalHttpClient(environment);

    this.wiseAPI = axios.create({
      baseURL: "https://api.sandbox.transferwise.tech/v1",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.WISE_API_KEY}`
      }
    });
  }

  async resolveBankAccountForStripe(accountNumber, routingNumber) {
    try {
        const bankToken = await this.stripe.tokens.create({
            bank_account: {
                country: "US",
                currency: "usd",
                account_holder_type: "individual",
                routing_number: routingNumber,
                account_number: accountNumber
            }
        });

        return { success: true, bankTokenId: bankToken.id };
    } catch (error) {
        console.error("Stripe Bank Account Validation Error:", error);
        return { success: false, message: error.message };
    }
}
}


class PaymentService extends BasePaymentService {
  constructor() {
    super();
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
          redirect_url: `${FRONTEND_URL}/dashboard_taskcreator/my_wallet?ref=${txRef}`,
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
          success_url: `${FRONTEND_URL}/dashboard_taskcreator/my_wallet?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${FRONTEND_URL}/login`,
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
            return_url: `${FRONTEND_URL}/dashboard_taskcreator/my_wallet?ref=${paymentData.reference}`,
            cancel_url: `${FRONTEND_URL}/login`,
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
          redirect_url: `${FRONTEND_URL}/dashboard_taskcreator/my_wallet?ref=${quoteId}`, // Success URL
          cancel_url: `${FRONTEND_URL}/login`, // Cancel/failure URL
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



class WithdrawalService extends BasePaymentService {
  constructor() {
    super();
  }

  async processWithdrawal(withdrawalData) {
    try {
      switch (withdrawalData.gateway) {
        case 'flutterwave':
          return await this.handleFlutterwaveWithdrawal(withdrawalData);
        case 'stripe-connect':
          return await this.handleStripeConnectWithdrawal(withdrawalData);
        case 'stripe-bank':
          return await this.handleStripeBankWithdrawal(withdrawalData);
        case 'paypal':
          return await this.handlePaypalWithdrawal(withdrawalData);
        case 'wise':
          return await this.handleWiseWithdrawal(withdrawalData);
        default:
          throw new Error("Invalid withdrawal gateway selected");
      }
    } catch (error) {
      console.error("Withdrawal Error:", error);
      return { success: false, message: error.message };
    }
  }


  async handleFlutterwaveWithdrawal(withdrawalData) {
    try {
        const { bankCode, accountNumber, amount, currency } = withdrawalData;
        const payload = {
            account_bank: bankCode,
            account_number: accountNumber,
            amount: amount,
            narration: "Wallet Withdrawal",
            currency: currency,
            reference: `WDL_${Date.now()}_PMCKDU_1`,
            debit_currency: currency,
            callback_url: `https://altbucks-server-t.onrender.com/api/v1/webhooks/flutterwave`,
        };

        const response = await this.flutterwaveAPI.post("/transfers", payload);
        
        return {
            success: response.data.status === "success",
            reference: response.data.data?.reference,
            id: response.data.data?.id,
            status: response.data.data?.status,
            data: response.data.data,
        };
    } catch (error) {
        console.error("Flutterwave Withdrawal Error:", error);
        return { success: false, message: error.message, error: error };
    }
}


  async handleStripeConnectWithdrawal(withdrawalData) {
    try {
    const { stripeAccountId, amount, currency } = withdrawalData;
    const payout = await this.stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      destination: stripeAccountId,
      transfer_group: `withdrawal_${Date.now()}`
    });

    return { success: true, id: payout.id, status: payout.status, reference: payout.id };
  } catch (error) {
    console.error("Stripe Connect Payout Error:", error);
    return { success: false, message: error.message, error: error };
  }
}

  async handleStripeBankWithdrawal(withdrawalData) {
    const { accountNumber, routingNumber, amount, currency } = withdrawalData;

    try {
        // ✅ Validate & Tokenize Bank Account
        const bankValidation = await this.resolveBankAccountForStripe(accountNumber, routingNumber);
        if (!bankValidation.success) throw new Error(bankValidation.message);

        // ✅ Create a bank account for payout
        const bankAccount = await this.stripe.accounts.createExternalAccount(
            process.env.STRIPE_PLATFORM_ACCOUNT, 
            { external_account: bankValidation.bankTokenId }
        );

        const payoutRecipient = bankAccount.id;

        // ✅ Initiate the Instant Payout
        const payout = await this.stripe.payouts.create({
            amount: Math.round(amount * 100),
            currency: currency.toLowerCase(),
            method: "instant",
            destination: payoutRecipient
        });

        return { success: true, id: payout.id, status: payout.status, reference: payout.id };

    } catch (error) {
        console.error("Stripe Bank Payout Error:", error);
        return { success: false, message: error.message };
    }
}


  async handlePaypalWithdrawal(withdrawalData) {
    try {
    const request = new paypal.payouts.PayoutsPostRequest();
    request.requestBody({
      sender_batch_header: {
        sender_batch_id: `WD_${Date.now()}`,
        email_subject: "You have a new withdrawal",
      },
      items: [
        {
          recipient_type: "EMAIL",
          amount: {
            value: withdrawalData.amount.toString(),
            currency: withdrawalData.currency,
          },
          receiver: withdrawalData.paypalEmail,
          note: "Wallet Withdrawal",
          sender_item_id: `WD_${Date.now()}`,
        },
      ],
    });

    const response = await this.paypalClient.execute(request);
    return response.result;
  } catch (error) {
    console.error("PayPal Withdrawal Error:", error);
    return { success: false, message: error.message, error: error };
  }
}

  async handleWiseWithdrawal(withdrawalData) {
    try {
        // Step 1: Check if recipientId is provided, otherwise create a recipient
        let recipientId = withdrawalData.recipientId;

        if (!recipientId) {
            const recipientPayload = {
                accountHolderName: withdrawalData.accountHolderName,
                currency: withdrawalData.currency,
                type: withdrawalData.sortCode
                    ? "sort_code"
                    : withdrawalData.routingNumber
                    ? "aba"
                    : withdrawalData.IBAN
                    ? "iban"
                    : withdrawalData.bankCode
                    ? "nuban" // Nigerian banks use NUBAN format
                    : null,
                details: {
                    sortCode: withdrawalData.sortCode || undefined, // UK Banks
                    routingNumber: withdrawalData.routingNumber || undefined, // US Banks
                    IBAN: withdrawalData.IBAN || undefined, // EU Banks
                    bankCode: withdrawalData.bankCode || undefined, // NGN Banks
                    accountNumber: withdrawalData.accountNumber
                }
            };

            if (!recipientPayload.type) {
                throw new Error("Missing required bank details for Wise recipient.");
            }

            const recipientResponse = await this.wiseAPI.post("/v1/accounts", recipientPayload);
            recipientId = recipientResponse.data.id; // Extract Wise recipient ID
        }

        // Step 2: Initiate the Transfer
        const transferPayload = {
            targetAccount: recipientId,
            sourceCurrency: withdrawalData.currency,
            targetCurrency: withdrawalData.currency,
            amount: withdrawalData.amount,
            reference: "Wallet Withdrawal"
        };

        const transferResponse = await this.wiseAPI.post("/v1/transfers", transferPayload);
        return transferResponse.data;

    } catch (error) {
        console.error("Wise Withdrawal Error:", error);
        throw new Error(error.response?.data?.message || "Withdrawal failed");
    }
}
}

  // constructor() {
  //   this.flutterwaveAPI = axios.create({
  //     baseURL: "https://api.flutterwave.com/v3",
  //     headers: {
  //       "Content-Type": "application/json",
  //       "Authorization": `Bearer ${process.env.FLW_SECRET_KEY}`
  //     }
  //   });

  //   // Initialize Stripe SDK
  //   this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  //     apiVersion: '2025-01-27.acacia',
  //   });

  //   // Initialize PayPal SDK (using the Sandbox environment for testing)
  //   const environment = new paypal.core.SandboxEnvironment(
  //     process.env.PAYPAL_CLIENT_ID,
  //     process.env.PAYPAL_CLIENT_SECRET
  //   );
  //   this.paypalClient = new paypal.core.PayPalHttpClient(environment);

  //   this.wiseAPI = axios.create({
  //     // baseURL: "https://api.wise.com/v1",
  //     baseURL: "https://api.sandbox.transferwise.tech/v1", // Use Wise Sandbox API
  //     headers: {
  //       "Content-Type": "application/json",
  //       "Authorization": `Bearer ${process.env.WISE_API_KEY}`
  //     }
  //   });
  // }

// class WithdrawalService {
//   constructor() {
//     this.flutterwaveAPI = axios.create({
//       baseURL: "https://api.flutterwave.com/v3",
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": `Bearer ${process.env.FLW_SECRET_KEY}`
//       }
//     });

//     this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
//       apiVersion: '2025-01-27.acacia',
//     });

//     const environment = new paypal.core.SandboxEnvironment(
//       process.env.PAYPAL_CLIENT_ID,
//       process.env.PAYPAL_CLIENT_SECRET
//     );
//     this.paypalClient = new paypal.core.PayPalHttpClient(environment);

//     this.wiseAPI = axios.create({
//       baseURL: "https://api.sandbox.transferwise.tech/v1",
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": `Bearer ${process.env.WISE_API_KEY}`
//       }
//     });
//   }


//     /**
//    * Verify bank account details for Stripe withdrawals (U.S. only)
//    */
//     async resolveBankAccountForStripe(accountNumber, routingNumber) {
//       try {
//         // Create a Stripe bank account token to validate details
//         const bankAccount = await stripe.tokens.create({
//           bank_account: {
//             country: "US",
//             currency: "usd",
//             account_holder_type: "individual",
//             routing_number: routingNumber,
//             account_number: accountNumber
//           }
//         });
  
//         return { success: true, bankAccount };
//       } catch (error) {
//         console.error("Stripe Bank Account Validation Error:", error);
//         return { success: false, message: error.message };
//       }
//     }



//   /**
//    * Process withdrawal for different payment gateways
//    */
//   async processWithdrawal(withdrawalData) {
//     switch (withdrawalData.gateway) {
//       // Handle Flutterwave Payouts (Nigerian Bank Account)
//       case 'flutterwave': {
//         const payload = {
//           account_bank: withdrawalData.bankCode,
//           account_number: withdrawalData.accountNumber,
//           amount: withdrawalData.amount,
//           narration: "Wallet Withdrawal",
//           currency: withdrawalData.currency,
//           reference: `WD_${Date.now()}`,
//           debit_currency: withdrawalData.currency,
//         };
//         const response = await this.flutterwaveAPI.post("/transfers", payload);
//         return response.data;
//       }

// // Handle Stripe Connect Payouts
// case "stripe-connect": {
//   const { stripeAccountId, amount, currency } = withdrawalData;

//   const payout = await stripe.transfers.create({
//     amount: Math.round(amount * 100), // Convert to cents
//     currency: currency.toLowerCase(),
//     destination: stripeAccountId, // Connected account ID
//     transfer_group: `withdrawal_${Date.now()}`
//   });

//   return { success: true, id: payout.id, status: payout.status, reference: payout.id };
// }

// // Handle Stripe Direct Bank Payouts (U.S. only)
// case "stripe-bank": {
//   const { accountNumber, routingNumber, accountHolderName, amount, currency } = withdrawalData;

//   // Validate the bank details before processing the withdrawal
//   const bankValidation = await this.resolveBankAccountForStripe(accountNumber, routingNumber);
//   if (!bankValidation.success) {
//     throw new Error(bankValidation.message);
//   }

//   const payout = await stripe.payouts.create({
//     amount: Math.round(amount * 100),
//     currency: currency.toLowerCase(),
//     method: "standard",
//     destination: bankValidation.bankAccount.id
//   });

//   return { success: true, id: payout.id, status: payout.status, reference: payout.id };
// }

// // Handle Paypal Payouts via paypal email
//       case 'paypal': {
//         const request = new paypal.payouts.PayoutsPostRequest();
//         request.requestBody({
//           sender_batch_header: {
//             sender_batch_id: `WD_${Date.now()}`,
//             email_subject: "You have a new withdrawal",
//           },
//           items: [
//             {
//               recipient_type: "EMAIL",
//               amount: {
//                 value: withdrawalData.amount.toString(),
//                 currency: withdrawalData.currency,
//               },
//               receiver: withdrawalData.paypalEmail,
//               note: "Wallet Withdrawal",
//               sender_item_id: `WD_${Date.now()}`,
//             },
//           ],
//         });
//         const response = await this.paypalClient.execute(request);
//         return response.result;
//       }

//       // Handle Wise Payouts
//       case 'wise': {
//         // Step 1: Create a transfer
//         const transferPayload = {
//           targetAccount: withdrawalData.wiseRecipientId,
//           sourceCurrency: withdrawalData.currency,
//           targetCurrency: withdrawalData.currency,
//           amount: withdrawalData.amount,
//           reference: "Wallet Withdrawal",
//         };
//         const response = await this.wiseAPI.post("/transfers", transferPayload);
//         return response.data;
//       }
//       default:
//         throw new Error("Invalid withdrawal gateway selected");
//     }
//   }
// }


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


const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;

// Helper function to validate the bank account using Flutterwave
const verifyBankAccount = async (bankCode, accountNumber) => {
  try {
    const reqBody = {
      account_number: accountNumber,
      account_bank: bankCode,
    };

    // Send POST request to Flutterwave API to validate the bank account
    const response = await axios.post(
      "https://api.flutterwave.com/v3/accounts/resolve",
      reqBody,
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Return the response data from Flutterwave
    return response.data;
  } catch (error) {
    // Handle specific errors from Flutterwave API
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const errorMessage =
          error.response.data.message ||
          "An error occurred while validating the bank account.";
        console.error("Flutterwave API Error:", error.response.data);
        throw new Error(errorMessage);
      }

      throw new Error(
        "Internal Server Error: Could not communicate with Flutterwave API."
      );
    }
    throw new Error(
      "An unexpected error occurred during bank account validation."
    );
  }
};


module.exports = { PaymentService, WithdrawalService, TransactionService, WalletService, paymentGatewayCurrencies, verifyBankAccount };