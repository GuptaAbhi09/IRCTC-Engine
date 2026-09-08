const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const config = require('./config');
const logger = require('./config/logger');
const corsMiddleware = require('./middlewares/cors.middleware');
const reqLogger = require('./middlewares/req.middleware');
const errorHandler = require('./middlewares/error.middleware');
const notFoundHandler = require('./middlewares/notFound.middleware');
const routes = require('./routes');

const app = express();

// Security and utility middlewares
app.use(helmet());
app.use(corsMiddleware);
app.use(cookieParser());
app.use(reqLogger);

// Note: express.json() is NOT registered globally here so body streams can be proxied as-is to microservices

// Register Gateway routes
app.use('/', routes);

// 404 Route handler
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

// Start Gateway Server
app.listen(config.port, () => {
  logger.info(`[API GATEWAY] Running on port ${config.port} in ${config.env} mode`);
  logger.info(`[API GATEWAY] Proxying /api/v1/auth & /api/v1/users ──► ${config.services.userServiceUrl}`);
});
