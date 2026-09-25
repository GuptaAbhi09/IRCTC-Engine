const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const idempotencyMiddleware = require('../middlewares/idempotency.middleware');

// POST /api/v1/bookings/reserve
router.post('/reserve', idempotencyMiddleware, bookingController.reserve);

module.exports = router;
