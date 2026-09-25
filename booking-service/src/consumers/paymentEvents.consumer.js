const { consumer } = require('../config/kafka');
const prisma = require('../config/db');
const logger = require('../config/logger');

/**
 * Consumer for payment.success Kafka events
 * CAS updates booking status from PAYMENT_PENDING -> CONFIRMING
 */
const startPaymentEventsConsumer = async () => {
  try {
    await consumer.subscribe({ topic: 'payment.success', fromBeginning: true });
    logger.info('🚀 Booking Service subscribed to Kafka topic: payment.success');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const payload = JSON.parse(message.value.toString());
          const { bookingId, razorpayPaymentId, source } = payload;

          logger.info(`📥 Received [payment.success] event for Booking ${bookingId} via ${source}`);

          // CAS Update: PAYMENT_PENDING -> CONFIRMING
          const result = await prisma.booking.updateMany({
            where: {
              id: bookingId,
              status: { in: ['SEATS_HELD', 'PAYMENT_PENDING'] }
            },
            data: {
              status: 'CONFIRMING',
              paymentId: razorpayPaymentId
            }
          });

          if (result.count > 0) {
            logger.info(`✅ CAS State Transition: Booking ${bookingId} status updated to CONFIRMING`);
          } else {
            logger.warn(`⚠️ CAS State Skipped: Booking ${bookingId} is already in state CONFIRMING/CONFIRMED or cancelled.`);
          }
        } catch (err) {
          logger.error(`❌ Error processing payment event: ${err.message}`);
        }
      }
    });
  } catch (error) {
    logger.error(`❌ Kafka Consumer start error: ${error.message}`);
  }
};

module.exports = { startPaymentEventsConsumer };
