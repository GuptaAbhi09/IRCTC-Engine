const Redis = require('ioredis');
const logger = require('./logger');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

redis.on('connect', () => {
  logger.info('✅ Booking Service connected to Redis');
});

redis.on('error', (err) => {
  logger.error('❌ Redis Connection Error:', err);
});

module.exports = redis;
