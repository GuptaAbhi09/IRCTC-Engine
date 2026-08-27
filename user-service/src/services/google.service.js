const { OAuth2Client } = require('google-auth-library');
const config = require('../config');
const logger = require('../config/logger');

const client = new OAuth2Client(config.googleClientId);

/**
 * Verifies Google id_token sent from frontend client
 * @param {string} idToken 
 * @returns {Promise<{ email: string, firstName: string, lastName: string, emailVerified: boolean }>}
 */
const verifyGoogleIdToken = async (idToken) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.googleClientId || undefined,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid Google token payload');
    }

    return {
      email: payload.email,
      firstName: payload.given_name || payload.name || 'User',
      lastName: payload.family_name || '',
      emailVerified: payload.email_verified || false,
    };
  } catch (error) {
    logger.error(`Google id_token verification failed: ${error.message}`);
    const customError = new Error('Invalid or expired Google token');
    customError.statusCode = 401;
    throw customError;
  }
};

module.exports = {
  verifyGoogleIdToken,
};
