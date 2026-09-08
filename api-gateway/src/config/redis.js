const Redis = require('ioredis');
const config = require('./index');
const logger = require('./logger');

const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('[API GATEWAY REDIS] Connected successfully for rate limiting');
});

redis.on('error', (err) => {
  logger.error(`[API GATEWAY REDIS] Connection error: ${err.message}`);
});

module.exports = redis;
