const { Kafka, logLevel } = require('kafkajs');
const config = require('./index');
const logger = require('./logger');

const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  logLevel: logLevel.ERROR,
  retry: {
    initialRetryTime: 300,
    retries: 8,
  },
});

const producer = kafka.producer();
let isProducerConnected = false;

/**
 * Connects the Kafka Producer to the cluster
 */
const connectProducer = async () => {
  if (isProducerConnected) return producer;

  try {
    await producer.connect();
    isProducerConnected = true;
    logger.info('Kafka Producer connected successfully');
    return producer;
  } catch (error) {
    logger.error(`Failed to connect Kafka Producer: ${error.message}`);
    throw error;
  }
};

/**
 * Gracefully disconnects the Kafka Producer
 */
const disconnectProducer = async () => {
  if (isProducerConnected) {
    await producer.disconnect();
    isProducerConnected = false;
    logger.info('Kafka Producer disconnected');
  }
};

module.exports = {
  kafka,
  producer,
  connectProducer,
  disconnectProducer,
};
