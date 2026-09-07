const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [NOTIFICATION-SERVICE] [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new transports.Console(),
  ],
});

module.exports = logger;
