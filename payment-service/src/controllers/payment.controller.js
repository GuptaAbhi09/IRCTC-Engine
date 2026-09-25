const paymentService = require('../services/payment.service');

const createOrder = async (req, res, next) => {
  try {
    const { bookingId, amount, pnr } = req.body;
    if (!bookingId || !amount || !pnr) {
      return res.status(400).json({ success: false, message: 'bookingId, amount, and pnr are required' });
    }

    const orderData = await paymentService.createPaymentOrder(bookingId, amount, pnr);
    res.status(201).json({ success: true, data: orderData });
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const result = await paymentService.processPaymentSuccess(
      bookingId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      'CALLBACK'
    );

    res.status(200).json({ success: true, message: 'Payment verified successfully', data: result });
  } catch (error) {
    next(error);
  }
};

const handleWebhook = async (req, res, next) => {
  try {
    const { payload } = req.body;
    // Process webhook payload if present
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createOrder, verifyPayment, handleWebhook };
