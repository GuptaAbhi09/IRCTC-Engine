const { Kafka, logLevel } = require('kafkajs');
const config = require('./index');
const logger = require('./logger');

const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  logLevel: logLevel.ERROR,
  retry: {
    initialRetryTime: 300,
    retries: 10,
  },
});

const consumer = kafka.consumer({
  groupId: config.kafka.groupId,
});

/**
 * Connects Kafka Consumer and subscribes to notification topics
 */
const connectConsumer = async () => {
  try {
    await consumer.connect();
    logger.info(`Kafka Consumer connected successfully [Group: ${config.kafka.groupId}]`);
  } catch (error) {
    logger.error(`Failed to connect Kafka Consumer: ${error.message}`);
    throw error;
  }
};

/**
 * Gracefully disconnects Kafka Consumer
 */
const disconnectConsumer = async () => {
  try {
    await consumer.disconnect();
    logger.info('Kafka Consumer disconnected');
  } catch (error) {
    logger.error(`Error disconnecting Kafka Consumer: ${error.message}`);
  }
};

module.exports = {
  kafka,
  consumer,
  connectConsumer,
  disconnectConsumer,
};
