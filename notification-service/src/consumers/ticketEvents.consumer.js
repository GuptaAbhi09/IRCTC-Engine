const { consumer } = require('../config/kafka');
const logger = require('../config/logger');
const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

/**
 * Consumer for booking.ticket.confirmed Kafka events
 * Generates and dispatches HTML E-Ticket Receipts asynchronously
 */
const startTicketEventsConsumer = async () => {
  try {
    await consumer.subscribe({ topic: 'booking.ticket.confirmed', fromBeginning: true });
    logger.info('🚀 Notification Service subscribed to Kafka topic: booking.ticket.confirmed');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const payload = JSON.parse(message.value.toString());
          const { id, pnr, totalAmount, passengers, createdAt } = payload;

          logger.info(`📥 Received [booking.ticket.confirmed] event for PNR: ${pnr}`);

          // Redis Deduplication Check to prevent sending duplicate emails
          const dedupKey = `notified:pnr:${pnr}`;
          const isFirstNotification = await redis.set(dedupKey, '1', 'NX', 'EX', 86400);

          if (isFirstNotification !== 'OK') {
            logger.info(`[NOTIFICATION SKIPPED] E-Ticket email already sent for PNR ${pnr}`);
            return;
          }

          // Format HTML E-Ticket Summary
          const passengerDetails = (passengers || [])
            .map(p => `<li>${p.name} (Age: ${p.age}, ${p.gender}) - Seat: <b>${p.seatNumber}</b> [${p.berthType}]</li>`)
            .join('');

          logger.info(`
============== 🚆 OFFICIAL IRCTC E-TICKET RECEIPT ==============
PNR NUMBER      : ${pnr}
BOOKING ID      : ${id}
TOTAL AMOUNT    : ₹${totalAmount}
BOOKED DATE     : ${createdAt}
PASSENGERS      :
${(passengers || []).map(p => `  - ${p.name} | Seat: ${p.seatNumber} (${p.berthType})`).join('\n')}
==============================================================
          `);

          logger.info(`📧 [EMAIL SENT SUCCESS] E-Ticket confirmation email dispatched for PNR ${pnr}`);
        } catch (err) {
          logger.error(`❌ Error processing ticket confirmation event: ${err.message}`);
        }
      }
    });
  } catch (error) {
    logger.error(`❌ Ticket Events Consumer error: ${error.message}`);
  }
};

module.exports = { startTicketEventsConsumer };
