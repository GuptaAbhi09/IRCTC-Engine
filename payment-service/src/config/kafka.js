const { Kafka, logLevel } = require('kafkajs');
const logger = require('./logger');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'payment-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  logLevel: logLevel.INFO
});

const producer = kafka.producer();

const connectKafka = async () => {
  try {
    await producer.connect();
    logger.info('✅ Payment Service connected to Kafka Producer successfully');
  } catch (error) {
    logger.error('❌ Kafka Connection Error:', error);
  }
};

module.exports = { kafka, producer, connectKafka };
