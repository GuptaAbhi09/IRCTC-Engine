/**
 * Returns HTML email template for OTP Verification
 */
const getOtpEmailTemplate = (firstName, otp) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #003366; text-align: center;">IRCTC Account Verification</h2>
      <p>Hello <strong>${firstName}</strong>,</p>
      <p>Thank you for signing up with IRCTC. Your One-Time Password (OTP) for account verification is:</p>
      <div style="background-color: #f4f6f9; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #003366;">${otp}</span>
      </div>
      <p>This OTP is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
      <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888888; text-align: center;">If you did not request this OTP, please ignore this email.</p>
    </div>
  `;
};

/**
 * Returns HTML email template for Welcome Email after account creation
 */
const getWelcomeEmailTemplate = (firstName) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #003366; text-align: center;">Welcome to IRCTC! 🚆</h2>
      <p>Hello <strong>${firstName}</strong>,</p>
      <p>Your IRCTC account has been successfully created and verified!</p>
      <p>You can now log in to book train tickets, check PNR status, and explore services seamlessy.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="http://localhost:3000/login" style="background-color: #003366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Log In to Your Account</a>
      </div>
      <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888888; text-align: center;">IRCTC Customer Support Team</p>
    </div>
  `;
};

module.exports = {
  getOtpEmailTemplate,
  getWelcomeEmailTemplate,
};
