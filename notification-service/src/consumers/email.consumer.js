const { consumer } = require('../config/kafka');
const logger = require('../config/logger');
const { sendEmailWithRetry } = require('../services/mail.service');
const { getOtpEmailTemplate, getWelcomeEmailTemplate } = require('../templates/email.templates');

const TOPICS = [
  'notification.email.otp',
  'notification.email.welcome',
];

/**
 * Starts Kafka Consumer and subscribes to notification email topics
 */
const startEmailConsumer = async () => {
  try {
    // Subscribe to topics
    await consumer.subscribe({ topics: TOPICS, fromBeginning: false });
    logger.info(`Subscribed to Kafka topics: ${TOPICS.join(', ')}`);

    // Process incoming message stream
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const rawPayload = message.value.toString();
        logger.info(`Received event from topic [${topic}] (Partition: ${partition}): ${rawPayload}`);

        try {
          const eventPayload = JSON.parse(rawPayload);
          const { data } = eventPayload;

          if (topic === 'notification.email.otp') {
            const { email, firstName, otp } = data;
            const html = getOtpEmailTemplate(firstName, otp);
            await sendEmailWithRetry(email, 'Verify your IRCTC Account - OTP', html);
          } else if (topic === 'notification.email.welcome') {
            const { email, firstName } = data;
            const html = getWelcomeEmailTemplate(firstName);
            await sendEmailWithRetry(email, 'Welcome to IRCTC! 🚆', html);
          }
        } catch (err) {
          logger.error(`Error processing Kafka message from topic [${topic}]: ${err.message}`);
        }
      },
    });
  } catch (error) {
    logger.error(`Kafka Consumer error: ${error.message}`);
  }
};

module.exports = {
  startEmailConsumer,
};
