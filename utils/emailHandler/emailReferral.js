const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendReferralEmail = async (email, subject, message) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: `<p>${message}</p>`,
    });

    console.log(`Referral invite sent to ${email} with subject: ${subject}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to send referral invite to ${email}:`, error.message);
      throw error;
    }
  }
};

module.exports = { sendReferralEmail };