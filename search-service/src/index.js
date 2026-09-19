const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const config = require('./config');
const logger = require('./config/logger');
const corsMiddleware = require('./middlewares/cors.middleware');
const { connectElasticSearch } = require('./config/elasticsearch');
const { initializeIndicesAndMappings } = require('./indexers/mapping.indexer');

const app = express();

// Middlewares
app.use(helmet());
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Search service is running optimally' });
});

// Start Search Service Server & Connect ElasticSearch
app.listen(config.port, async () => {
  logger.info(`[SEARCH-SERVICE] Running on port ${config.port} in ${config.env} mode`);
  try {
    await connectElasticSearch();
    await initializeIndicesAndMappings();
  } catch (err) {
    logger.error(`[SEARCH-SERVICE] ElasticSearch initialization warning: ${err.message}`);
  }
});
