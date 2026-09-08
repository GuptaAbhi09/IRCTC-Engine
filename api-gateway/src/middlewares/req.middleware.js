const logger = require('../config/logger');

const reqLogger = (req, res, next) => {
  logger.info(`[GATEWAY INCOMING] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
};

module.exports = reqLogger;
