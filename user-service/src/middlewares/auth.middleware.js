const config = require('../config');
const { verifyAccessToken } = require('../utils/token.util');

/**
 * Authentication Middleware: Verifies Access Token from Cookie or Bearer Header
 */
const authenticateUser = async (req, res, next) => {
  try {
    // 1. Check httpOnly cookie or Authorization Bearer header
    let token = req.cookies[config.jwt.accessTokenCookieName];

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid access token.',
      });
    }

    // 2. Verify Access Token signature and expiration
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired access token. Please refresh your token.',
      });
    }

    // 3. Attach user payload to request context
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticateUser,
};
