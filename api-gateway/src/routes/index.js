const express = require('express');
const config = require('../config');
const createProxy = require('../services/proxy');
const { authenticateUser } = require('../middlewares/auth.middleware');
const { createRateLimiter } = require('../middlewares/rateLimiting.middleware');

const router = express.Router();

// 1. Gateway Health Check Route
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'API Gateway',
    timestamp: new Date().toISOString(),
  });
});

// 2. User Service - Public Auth Routes Proxy (/api/v1/auth/*)
// IP-based Rate Limit: 10 requests per 60 seconds
router.use(
  '/api/v1/auth',
  createRateLimiter({ windowInSeconds: 60, maxRequests: 10, type: 'IP' }),
  createProxy(config.services.userServiceUrl)
);

// 3. User Service - Private User Profile Routes Proxy (/api/v1/users/*)
// Authenticated User-based Rate Limit: 30 requests per 60 seconds
router.use(
  '/api/v1/users',
  authenticateUser,
  createRateLimiter({ windowInSeconds: 60, maxRequests: 30, type: 'USER' }),
  createProxy(config.services.userServiceUrl)
);

// 4. Admin Service - Private Admin Routes Proxy (/api/v1/admin/*)
router.use(
  '/api/v1/admin',
  authenticateUser,
  createRateLimiter({ windowInSeconds: 60, maxRequests: 30, type: 'USER' }),
  createProxy(config.services.adminServiceUrl)
);

// 5. Search Service - Public Search Routes Proxy (/api/v1/search/*)
router.use(
  '/api/v1/search',
  createRateLimiter({ windowInSeconds: 60, maxRequests: 60, type: 'IP' }),
  createProxy(config.services.searchServiceUrl)
);

// 6. Inventory Service - Public Availability Query Proxy (/api/v1/inventory/*)
router.use(
  '/api/v1/inventory',
  createRateLimiter({ windowInSeconds: 60, maxRequests: 60, type: 'IP' }),
  createProxy(config.services.inventoryServiceUrl)
);

// 7. Booking Service - Private Booking Routes Proxy (/api/v1/bookings/*)
router.use(
  '/api/v1/bookings',
  authenticateUser,
  createRateLimiter({ windowInSeconds: 60, maxRequests: 20, type: 'USER' }),
  createProxy(config.services.bookingServiceUrl)
);

module.exports = router;




