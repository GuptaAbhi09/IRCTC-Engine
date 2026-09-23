const redis = require('../config/redis');
const logger = require('../config/logger');

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROCESSING_TTL_SECONDS = 30;
const CACHED_RESPONSE_TTL_SECONDS = 86400; // 24 Hours

/**
 * Middleware to enforce idempotency on state-changing requests (POST/PUT/PATCH)
 */
const idempotencyMiddleware = async (req, res, next) => {
  const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];

  if (!idempotencyKey) {
    return res.status(400).json({
      success: false,
      message: 'Header "Idempotency-Key" (UUID v4) is required for this operation'
    });
  }

  if (!UUID_V4_REGEX.test(idempotencyKey)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid "Idempotency-Key" format. Must be a valid UUID v4 string'
    });
  }

  const redisKey = `idempotency:${idempotencyKey}`;

  try {
    const cachedDataStr = await redis.get(redisKey);

    if (cachedDataStr) {
      const cachedData = JSON.parse(cachedDataStr);

      if (cachedData.status === 'PROCESSING') {
        logger.warn(`[IDEMPOTENCY CONFLICT] Request with key ${idempotencyKey} is currently processing.`);
        return res.status(409).json({
          success: false,
          message: 'A request with this Idempotency-Key is currently processing. Please try again shortly.'
        });
      }

      if (cachedData.status === 'COMPLETED') {
        logger.info(`[IDEMPOTENCY HIT] Returning cached response for key: ${idempotencyKey}`);
        return res.status(cachedData.statusCode || 200).json(cachedData.body);
      }
    }

    // Set transient PROCESSING status in Redis
    await redis.set(redisKey, JSON.stringify({ status: 'PROCESSING' }), 'EX', PROCESSING_TTL_SECONDS);
    req.idempotencyKey = idempotencyKey;

    // Hook res.json to cache response payload when request finishes successfully
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache 2xx success responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const cachePayload = {
          status: 'COMPLETED',
          statusCode: res.statusCode,
          body
        };
        redis.set(redisKey, JSON.stringify(cachePayload), 'EX', CACHED_RESPONSE_TTL_SECONDS)
          .catch(err => logger.error(`[IDEMPOTENCY CACHE ERROR] ${err.message}`));
      } else {
        // Clear processing lock on error response so client can retry
        redis.del(redisKey).catch(err => logger.error(`[IDEMPOTENCY DEL ERROR] ${err.message}`));
      }

      return originalJson(body);
    };

    next();
  } catch (error) {
    logger.error(`[IDEMPOTENCY MIDDLEWARE ERROR] ${error.message}`);
    next(error);
  }
};

module.exports = idempotencyMiddleware;
