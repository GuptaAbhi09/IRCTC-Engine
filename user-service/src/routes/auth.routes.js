const express = require('express');
const {
  sendOtpHandler,
  verifyOtpHandler,
  loginHandler,
  googleLoginHandler,
  refreshHandler,
} = require('../controllers/auth.controller');

const router = express.Router();

// Route 1: Initiate signup by sending OTP
router.post('/send-otp', sendOtpHandler);

// Route 2: Verify OTP & complete user registration
router.post('/verify', verifyOtpHandler);

// Route 3: User Login
router.post('/login', loginHandler);

// Route 4: Google OAuth Login
router.post('/google', googleLoginHandler);

// Route 5: Refresh Token Rotation
router.post('/refresh', refreshHandler);

module.exports = router;
