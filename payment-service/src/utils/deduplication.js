const Redis = require('ioredis');
const logger = require('../config/logger');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

/**
 * Atomically checks and locks payment ID in Redis to prevent duplicate processing
 * Uses SET key value NX EX 86400 (24-hour expiry)
 * @param {string} paymentId Razorpay Payment ID (e.g. pay_8401928401)
 * @returns {Promise<boolean>} True if first notification (PROCESS), False if duplicate (IGNORE)
 */
const acquirePaymentDeduplicationLock = async (paymentId) => {
  if (!paymentId) return true;
  const key = `processed:payment:${paymentId}`;

  try {
    // SET key 1 NX EX 86400 -> returns 'OK' if key set, null if key exists
    const result = await redis.set(key, '1', 'NX', 'EX', 86400);
    const isFirstTime = result === 'OK';

    if (!isFirstTime) {
      logger.info(`[DEDUPLICATION MATCH] Payment ID ${paymentId} already processed by parallel notification path. Skipping.`);
    }

    return isFirstTime;
  } catch (error) {
    logger.error(`[DEDUPLICATION ERROR] Redis deduplication check failed: ${error.message}`);
    return true; // Fallback allow to prevent dropping payments
  }
};

module.exports = { acquirePaymentDeduplicationLock };
