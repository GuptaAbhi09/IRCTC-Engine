const { Kafka, logLevel } = require('kafkajs');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'inventory-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  logLevel: logLevel.INFO
});

const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'inventory-group' });
const producer = kafka.producer();

const connectKafka = async () => {
  try {
    await producer.connect();
    await consumer.connect();
    console.log('✅ Inventory Service connected to Kafka successfully');
  } catch (error) {
    console.error('❌ Kafka Connection Error:', error);
    process.exit(1);
  }
};

module.exports = { kafka, producer, consumer, connectKafka };
