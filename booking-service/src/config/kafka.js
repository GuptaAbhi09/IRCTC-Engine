const { Kafka, logLevel } = require('kafkajs');
const logger = require('./logger');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'booking-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  logLevel: logLevel.INFO
});

const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'booking-group' });
const producer = kafka.producer();

const connectKafka = async () => {
  try {
    await producer.connect();
    await consumer.connect();
    logger.info('✅ Booking Service connected to Kafka successfully');
  } catch (error) {
    logger.error('❌ Kafka Connection Error:', error);
  }
};

module.exports = { kafka, producer, consumer, connectKafka };
