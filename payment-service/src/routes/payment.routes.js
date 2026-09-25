const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

// POST /api/v1/payments/create-order
router.post('/create-order', paymentController.createOrder);

// POST /api/v1/payments/verify
router.post('/verify', paymentController.verifyPayment);

// POST /api/v1/payments/webhook
router.post('/webhook', paymentController.handleWebhook);

module.exports = router;
