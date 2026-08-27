const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const config = require('./config');
const logger = require('./config/logger');
const corsMiddleware = require('./middlewares/cors.middleware');
const errorHandler = require('./middlewares/error.middleware');
const reqLogger = require('./middlewares/req.middleware');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');

const app = express();

// Middlewares
app.use(helmet());
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(reqLogger);

// Health Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'User service is running optimally' });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// Error Handling Middleware (must be registered at the end)
app.use(errorHandler);

// Start Server
app.listen(config.port, () => {
  logger.info(`User service is running on port ${config.port}`);
});
