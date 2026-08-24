/**
 * Generates HTML email content for OTP verification
 * @param {string} firstName 
 * @param {string} otp 
 * @returns {string} HTML string
 */
const getOtpEmailTemplate = (firstName, otp) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>IRCTC Email Verification</title>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; }
        .container { max-width: 500px; background: #ffffff; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .header { background: #1a365d; color: #ffffff; text-align: center; padding: 20px; font-size: 22px; font-weight: bold; }
        .content { padding: 30px; text-align: center; color: #333333; }
        .otp-box { display: inline-block; background: #edf2f7; color: #2b6cb0; font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 12px 24px; border-radius: 6px; margin: 20px 0; }
        .footer { font-size: 12px; color: #a0aec0; text-align: center; padding: 15px; border-top: 1px solid #edf2f7; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">IRCTC User Portal</div>
        <div class="content">
          <p>Hello <strong>${firstName}</strong>,</p>
          <p>Thank you for signing up with IRCTC. Use the verification code below to complete your registration:</p>
          <div class="otp-box">${otp}</div>
          <p>This OTP is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
        </div>
        <div class="footer">
          &copy; IRCTC Application. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  getOtpEmailTemplate,
};
