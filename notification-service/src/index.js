const express = require('express');
const config = require('./config');
const logger = require('./config/logger');
const { connectConsumer, disconnectConsumer } = require('./config/kafka');
const { startEmailConsumer } = require('./consumers/email.consumer');

const app = express();

app.use(express.json());

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Notification service is running optimally' });
});

// Start Server and initialize Kafka Consumer
app.listen(config.port, async () => {
  logger.info(`Notification service running on port ${config.port}`);
  try {
    await connectConsumer();
    await startEmailConsumer();
  } catch (err) {
    logger.error(`Failed to initialize notification service consumer: ${err.message}`);
  }
});

// Graceful Shutdown Handlers
const gracefulShutdown = async () => {
  logger.info('Shutting down notification service...');
  await disconnectConsumer();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
