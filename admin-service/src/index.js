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

const adminRoutes = require('./routes');

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Admin service is running optimally' });
});

// Admin API Routes
app.use('/api/v1/admin', adminRoutes);

// Centralized Error Handler
app.use(errorHandler);

// Start Admin Service Server
app.listen(config.port, () => {
  logger.info(`[ADMIN-SERVICE] Server running on port ${config.port} in ${config.env} mode`);
});
