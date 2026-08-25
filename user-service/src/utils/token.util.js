const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Generates short-lived Access Token
 * @param {object} payload { userId, email }
 * @returns {string} JWT Token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpirySeconds,
  });
};

/**
 * Generates long-lived Refresh Token with unique jti claim
 * @param {object} payload { userId, email }
 * @param {string} jti Unique token identifier UUID
 * @returns {string} JWT Token
 */
const generateRefreshToken = (payload, jti) => {
  return jwt.sign({ ...payload, jti }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpirySeconds,
  });
};

/**
 * Verifies Access Token
 * @param {string} token 
 * @returns {object} Decoded payload
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, config.jwt.accessSecret);
};

/**
 * Verifies Refresh Token
 * @param {string} token 
 * @returns {object} Decoded payload including jti
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, config.jwt.refreshSecret);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
