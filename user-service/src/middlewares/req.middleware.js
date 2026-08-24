const logger = require('../config/logger');

const reqLogger = (req, res, next) => {
  logger.info(`Incoming Request: ${req.method} ${req.originalUrl}`);
  next();
};

module.exports = reqLogger;
