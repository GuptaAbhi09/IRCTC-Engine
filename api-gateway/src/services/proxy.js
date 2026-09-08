const proxy = require('express-http-proxy');
const logger = require('../config/logger');

/**
 * Creates a reverse proxy middleware instance for a target downstream service
 * @param {string} targetUrl The base URL of the downstream service (e.g. http://localhost:3001)
 * @param {object} options Custom proxy configuration options
 */
const createProxy = (targetUrl, options = {}) => {
  return proxy(targetUrl, {
    // 1. Path Transformation / Rewriting rule
    proxyReqPathResolver: (req) => {
      // Retains original URL path when forwarding to downstream service
      const targetPath = req.originalUrl;
      logger.info(`[PROXY FORWARD] ${req.method} ${req.originalUrl} ──► ${targetUrl}${targetPath}`);
      return targetPath;
    },

    // 2. Request Decorator (Injects client identity headers to downstream microservices)
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      // Retain or attach client IP
      proxyReqOpts.headers['x-forwarded-for'] = srcReq.ip;

      // Inject verified user context if present (set by Gateway auth middleware)
      if (srcReq.user) {
        proxyReqOpts.headers['x-user-id'] = srcReq.user.userId;
        proxyReqOpts.headers['x-user-email'] = srcReq.user.email;
      }

      return proxyReqOpts;
    },

    // 3. Downstream Error Handling
    proxyErrorHandler: (err, res, next) => {
      logger.error(`[PROXY ERROR] Target ${targetUrl} unreachable: ${err.message}`);
      res.status(503).json({
        success: false,
        message: 'Downstream microservice unavailable or unreachable',
        error: err.message,
      });
    },

    ...options,
  });
};

module.exports = createProxy;
