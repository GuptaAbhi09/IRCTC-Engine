const express = require('express');
const config = require('../config');
const createProxy = require('../services/proxy');
const { authenticateUser } = require('../middlewares/auth.middleware');

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
router.use(
  '/api/v1/auth',
  createProxy(config.services.userServiceUrl)
);

// 3. User Service - Private User Profile Routes Proxy (/api/v1/users/*)
router.use(
  '/api/v1/users',
  authenticateUser,
  createProxy(config.services.userServiceUrl)
);

module.exports = router;

