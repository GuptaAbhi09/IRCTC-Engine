const express = require('express');
const { sendOtpHandler, verifyOtpHandler } = require('../controllers/auth.controller');

const router = express.Router();

// Route 1: Initiate signup by sending OTP
router.post('/send-otp', sendOtpHandler);

// Route 2: Verify OTP & complete user registration
router.post('/verify', verifyOtpHandler);

module.exports = router;
