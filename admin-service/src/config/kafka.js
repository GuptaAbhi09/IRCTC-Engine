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

const producer = kafka.producer();

const connectProducer = async () => {
  try {
    await producer.connect();
    logger.info('[ADMIN-SERVICE KAFKA] Producer connected successfully');
  } catch (error) {
    logger.error(`[ADMIN-SERVICE KAFKA] Connection error: ${error.message}`);
  }
};

module.exports = {
  producer,
  connectProducer,
};
