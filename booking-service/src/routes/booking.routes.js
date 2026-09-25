const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const idempotencyMiddleware = require('../middlewares/idempotency.middleware');

// POST /api/v1/bookings/reserve
router.post('/reserve', idempotencyMiddleware, bookingController.reserve);

// POST /api/v1/bookings/:bookingId/create-payment-order
router.post('/:bookingId/create-payment-order', bookingController.createPaymentOrder);

module.exports = router;

