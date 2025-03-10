const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

async function sendMail(options) {
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    // host: process.env.MAIL_SERVICE,
    // port: 587,
    // secure: false,
    // auth: {
    // user: process.env.MAIL_USER,
    // pass: process.env.MAIL_PASS,
    // },
    // tls: {
    //   rejectUnauthorized: false, // Helps with self-signed certificates
    // },
    });

    const mailOption = {
      from: process.env.EMAIL_USER,
      to: options.email,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments, // Attachments array
    };

    await transporter.sendMail(mailOption);
    return {
      success: true,
      message: "Email sent successfully",
    };
  } catch (Error) {
    // Type guard to check if the error is an instance of Error
    if (err instanceof Error) {
      console.error("Error sending mail:", err.message);

      return {
        success: false,
        message: "Error sending mail: " + err.message,
      };
    }
  }
}

module.exports = { sendMail };