const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  port: process.env.PORT || 3007,
  env: process.env.NODE_ENV || 'development',
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_irctc_mock_key_123',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'mock_secret_irctc_789456',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'mock_webhook_secret_abc123',
  }
};
