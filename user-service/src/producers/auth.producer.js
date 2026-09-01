const { producer } = require('../config/kafka');
const logger = require('../config/logger');

// Define Kafka Topics
const TOPICS = {
  EMAIL_OTP: 'notification.email.otp',
  EMAIL_WELCOME: 'notification.email.welcome',
};

/**
 * Publishes OTP event to Kafka topic notification.email.otp
 * @param {object} payload { email, firstName, otp }
 */
const publishOtpEvent = async ({ email, firstName, otp }) => {
  try {
    const eventPayload = {
      eventType: 'USER_OTP_REQUESTED',
      timestamp: new Date().toISOString(),
      data: {
        email,
        firstName,
        otp,
      },
    };

    await producer.send({
      topic: TOPICS.EMAIL_OTP,
      messages: [
        {
          key: email, // Message key ensures partitioning by email
          value: JSON.stringify(eventPayload),
        },
      ],
    });

    logger.info(`Kafka Event Published [${TOPICS.EMAIL_OTP}] for email: ${email}`);
  } catch (error) {
    logger.error(`Failed to publish OTP event to Kafka: ${error.message}`);
    // Non-blocking fallback: log error without interrupting user HTTP response
  }
};

/**
 * Publishes Welcome event to Kafka topic notification.email.welcome
 * @param {object} payload { email, firstName }
 */
const publishWelcomeEvent = async ({ email, firstName }) => {
  try {
    const eventPayload = {
      eventType: 'USER_REGISTERED_WELCOME',
      timestamp: new Date().toISOString(),
      data: {
        email,
        firstName,
      },
    };

    await producer.send({
      topic: TOPICS.EMAIL_WELCOME,
      messages: [
        {
          key: email,
          value: JSON.stringify(eventPayload),
        },
      ],
    });

    logger.info(`Kafka Event Published [${TOPICS.EMAIL_WELCOME}] for email: ${email}`);
  } catch (error) {
    logger.error(`Failed to publish Welcome event to Kafka: ${error.message}`);
  }
};

module.exports = {
  TOPICS,
  publishOtpEvent,
  publishWelcomeEvent,
};
