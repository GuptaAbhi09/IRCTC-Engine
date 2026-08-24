const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Hashes OTP string using SHA-256
 * @param {string} otp 
 * @returns {string} hex hash
 */
const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
};

/**
 * Hashes password using bcrypt
 * @param {string} password 
 * @returns {Promise<string>}
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Compares plain password with bcrypt hashed password
 * @param {string} password 
 * @param {string} hashedPassword 
 * @returns {Promise<boolean>}
 */
const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

module.exports = {
  hashOtp,
  hashPassword,
  comparePassword,
};
