const { Kafka } = require('kafkajs');
const config = require('./index');
const logger = require('./logger');

const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  retry: {
    initialRetryTime: 300,
    retries: 5,
  },
});

const consumer = kafka.consumer({ groupId: config.kafka.groupId });

const connectConsumer = async () => {
  try {
    await consumer.connect();
    logger.info(`[SEARCH-SERVICE KAFKA] Consumer connected successfully [Group: ${config.kafka.groupId}]`);
  } catch (error) {
    logger.error(`[SEARCH-SERVICE KAFKA] Consumer connection error: ${error.message}`);
  }
};

module.exports = {
  consumer,
  connectConsumer,
};
