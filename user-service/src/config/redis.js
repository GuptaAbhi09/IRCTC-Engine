const Redis = require('ioredis');
const config = require('./index');
const logger = require('./logger');

const redisUrl = config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('Redis client connected successfully');
});

redis.on('error', (err) => {
  logger.error(`Redis connection error: ${err.message}`);
});

module.exports = redis;
