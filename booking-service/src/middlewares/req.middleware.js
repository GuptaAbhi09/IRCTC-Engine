const logger = require('../config/logger');

const reqLogger = (req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
};

module.exports = reqLogger;
