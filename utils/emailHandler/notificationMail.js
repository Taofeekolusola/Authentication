const generateEmailTemplate = (subject, name, body) => {
    return `
      
  <!DOCTYPE html>
  <html lang="en">
  
  <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Notification Email</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0;
              padding: 0;
          }
  
          .email-container {
              max-width: 500px;
              background-color: #ffffff;
              border: 1px solid #ddd;
          }
  
          .email-header {
              display: flex;
              justify-content: center;
              align-items: center;
              width: 150px;
              height: auto;
              margin-top: 10px;
              object-fit: contain;
          }
  
          .email-header img {
              width: 150px;
              height: auto;
          }
  
          .email-content {
              background-color: white;
              text-align: left;
              color: #333;
              padding: 20px;
          }
  
          .email-content h1 {
              color: #1a3783;
              font-size: 24px;
          }
  
          .email-content p {
              font-size: 16px;
              margin: 20px 0;
          }
  
          .line {
              border-bottom: 1.5px solid #ccc;
              width: 100%;
          }
  
          .email-footer {
              text-align: center;
              padding: 10px 10px;
              font-size: 14px;
              color: #888;
              background-color: #f0efef;
          }
  
          .email-footer a {
              color: #500050;
              text-decoration: none;
          }
      </style>
  </head>
  
  <body>
   <center style="width: 100%;">
      <div class="email-container">
          <div class="email-header">
              <img src="https://res.cloudinary.com/dl4xukuf1/image/upload/v1739852891/Group_39230_mbcdwf.webp" alt="altBucks_Logo">
          </div>
          <div class="email-content">
              <h1>${subject}</h1>
              <div class="line"></div>
              <p>Hi ${name},</p>
              <p>${body}</p>
              <p>If this was not you, please contact our support team immediately.</p>
          </div>
          <div class="email-footer">
                  <p style="color: #333;">&#10084; &nbsp; <strong>AltBucks</strong></p>
                  <p>Get Paid for Simple Tasks Earn-Cash Online with AltBucks!</p>
                  <p style="color: #333;">Lagos, Nigeria</p>
                  <p><a href="mailto:support@altbucks.com">support@altbucks.com</a></p>
  
          </div>
      </div>
      </center>
  </body>
  
  </html>
      
      `;
  };
  
  module.exports = { generateEmailTemplate };