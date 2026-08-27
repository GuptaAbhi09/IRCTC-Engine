const express = require('express');
const { authenticateUser } = require('../middlewares/auth.middleware');
const { getProfileHandler, updateProfileHandler } = require('../controllers/user.controller');

const router = express.Router();

// Apply authentication middleware to all user profile routes
router.use(authenticateUser);

// Route 1: Get current user profile
router.get('/me', getProfileHandler);

// Route 2: Update current user profile
router.patch('/me', updateProfileHandler);

module.exports = router;
