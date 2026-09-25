const { createOrder, verifySignature } = require('../config/razorpay');
const { producer } = require('../config/kafka');
const logger = require('../config/logger');

/**
 * Creates Razorpay Payment Order & returns order details
 */
const createPaymentOrder = async (bookingId, amount, pnr) => {
  const order = await createOrder(amount, 'INR', pnr);

  logger.info(`[PAYMENT SERVICE] Created Order ${order.id} for Booking ${bookingId} (PNR: ${pnr})`);

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    pnr,
    bookingId
  };
};

/**
 * Handles Payment Verification / Webhook & publishes PAYMENT_SUCCESS to Kafka
 */
const processPaymentSuccess = async (bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature, source = 'CALLBACK') => {
  const isValid = verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!isValid) {
    const err = new Error('Invalid Razorpay signature verification');
    err.statusCode = 400;
    throw err;
  }

  const payload = {
    bookingId,
    razorpayOrderId,
    razorpayPaymentId,
    source,
    timestamp: new Date().toISOString()
  };

  // Publish PAYMENT_SUCCESS to Kafka topic 'payment.success'
  try {
    await producer.send({
      topic: 'payment.success',
      messages: [{ value: JSON.stringify(payload) }]
    });
    logger.info(`[PAYMENT KAFKA] Published payment.success event for Booking ${bookingId} via ${source}`);
  } catch (err) {
    logger.error(`[PAYMENT KAFKA ERROR] Failed to publish payment.success: ${err.message}`);
  }

  return payload;
};

module.exports = { createPaymentOrder, processPaymentSuccess };
