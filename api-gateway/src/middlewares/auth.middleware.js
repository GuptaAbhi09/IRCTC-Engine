const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Edge Authentication Middleware for API Gateway
 * Validates JWT Access Token from Cookie or Bearer header
 */
const authenticateUser = (req, res, next) => {
  try {
    // 1. Extract token from httpOnly cookie or Authorization Bearer header
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

    // 2. Verify token signature and expiration
    const decoded = jwt.verify(token, config.jwt.secret);

    // 3. Attach decoded identity context to request object
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired access token. Please refresh your token.',
    });
  }
};

module.exports = {
  authenticateUser,
};
