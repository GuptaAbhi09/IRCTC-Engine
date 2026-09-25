const bookingService = require('../services/booking.service');

const reserve = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'] || 1; // Injected by API Gateway auth middleware
    const payload = req.body;
    const idempotencyKey = req.idempotencyKey;

    const booking = await bookingService.reserveSeats(userId, payload, idempotencyKey);

    res.status(201).json({
      success: true,
      message: 'Seats held successfully. Please complete payment within 10 minutes.',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { reserve };
