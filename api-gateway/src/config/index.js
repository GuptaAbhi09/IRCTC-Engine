const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  services: {
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    bookingServiceUrl: process.env.BOOKING_SERVICE_URL || 'http://localhost:3002',
    adminServiceUrl: process.env.ADMIN_SERVICE_URL || 'http://localhost:3003',
  },
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecretjwtkey123!',
    accessTokenCookieName: process.env.ACCESS_TOKEN_COOKIE_NAME || 'accessToken',
  },
};
