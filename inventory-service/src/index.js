const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const config = require('./config');
const logger = require('./config/logger');
const corsMiddleware = require('./middlewares/cors.middleware');
const reqLogger = require('./middlewares/req.middleware');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

// Middlewares
app.use(helmet());
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(reqLogger);

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Inventory service is running optimally' });
});

// API Routes
const inventoryRoutes = require('./routes/inventory.routes');
app.use('/api/v1/inventory', inventoryRoutes);

// Centralized Error Handler
app.use(errorHandler);


const { connectKafka } = require('./config/kafka');
const { startScheduleConsumer } = require('./consumers/scheduleEvents.consumer');

// Start Inventory Service Server & Kafka Consumer
app.listen(config.port, async () => {
  logger.info(`[INVENTORY-SERVICE] Server running on port ${config.port} in ${config.env} mode`);
  try {
    await connectKafka();
    await startScheduleConsumer();
    logger.info('🚀 Schedule Events Kafka Consumer active and listening');
  } catch (err) {
    logger.error('Failed to initialize Kafka consumer:', err);
  }
});

