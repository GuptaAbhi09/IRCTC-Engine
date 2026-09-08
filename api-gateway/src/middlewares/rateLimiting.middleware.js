const redis = require('../config/redis');
const logger = require('../config/logger');

/**
 * Creates a Redis-backed Rate Limiting Middleware
 * @param {object} options Options for rate limiting
 * @param {number} options.windowInSeconds Window size in seconds (e.g. 60s)
 * @param {number} options.maxRequests Maximum requests permitted per window (e.g. 10 requests)
 * @param {string} options.type 'IP' for IP-based or 'USER' for User-ID based rate limiting
 */
const createRateLimiter = ({ windowInSeconds = 60, maxRequests = 100, type = 'IP' }) => {
  return async (req, res, next) => {
    try {
      // 1. Resolve rate limit key identifier (IP vs User-ID)
      let identifier;
      if (type === 'USER' && req.user && req.user.userId) {
        identifier = `user:${req.user.userId}`;
      } else {
        identifier = `ip:${req.ip || req.headers['x-forwarded-for'] || '127.0.0.1'}`;
      }

      const redisKey = `ratelimit:${type.toLowerCase()}:${identifier}`;

      // 2. Increment request count atomically in Redis
      const currentRequests = await redis.incr(redisKey);

      // 3. Set TTL on key if it was just initialized
      if (currentRequests === 1) {
        await redis.expire(redisKey, windowInSeconds);
      }

      // 4. Calculate TTL remaining for rate limit headers
      const ttl = await redis.ttl(redisKey);

      // Set standard RateLimit headers
      res.setHeader('RateLimit-Limit', maxRequests);
      res.setHeader('RateLimit-Remaining', Math.max(0, maxRequests - currentRequests));
      res.setHeader('RateLimit-Reset', ttl > 0 ? ttl : windowInSeconds);

      // 5. Exceeded limit check
      if (currentRequests > maxRequests) {
        logger.warn(`[RATE LIMIT EXCEEDED] ${type} identifier: ${identifier} on path ${req.originalUrl}`);
        res.setHeader('Retry-After', ttl > 0 ? ttl : windowInSeconds);
        return res.status(429).json({
          success: false,
          message: `Too many requests. Please try again after ${ttl > 0 ? ttl : windowInSeconds} seconds.`,
        });
      }

      next();
    } catch (error) {
      logger.error(`[RATE LIMITER ERROR] ${error.message}`);
      // Fail-open: If Redis rate limiter fails, permit request so app isn't blocked
      next();
    }
  };
};

module.exports = {
  createRateLimiter,
};
