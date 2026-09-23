const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  port: process.env.PORT || 3006,
  env: process.env.NODE_ENV || 'development',
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
  },
  services: {
    inventoryServiceUrl: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3005',
    paymentServiceUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3007',
  },
};
