const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`[ERROR] ${err.message}`, { stack: err.stack });

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
};

module.exports = errorHandler;
