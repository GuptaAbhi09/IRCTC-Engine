const crypto = require('crypto');

/**
 * Generates a secure random 6-digit numeric OTP
 * @returns {string} 6-digit OTP string
 */
const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

module.exports = {
  generateOtp,
};
