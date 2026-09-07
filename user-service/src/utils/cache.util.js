const redis = require('../config/redis');
const logger = require('../config/logger');

const PROFILE_CACHE_TTL = 900; // 15 minutes (in seconds)

/**
 * Generates Redis key for a user profile
 * @param {string} userId
 */
const getProfileCacheKey = (userId) => `user_profile:${userId}`;

/**
 * Fetch profile from Redis cache
 * @param {string} userId
 * @returns {object|null}
 */
const getCachedProfile = async (userId) => {
  try {
    const key = getProfileCacheKey(userId);
    const cachedData = await redis.get(key);
    if (cachedData) {
      logger.info(`[Cache HIT] Profile retrieved from Redis for userId: ${userId}`);
      return JSON.parse(cachedData);
    }
    logger.info(`[Cache MISS] Profile not found in Redis for userId: ${userId}`);
    return null;
  } catch (error) {
    logger.warn(`Redis GET profile cache failed: ${error.message}`);
    return null; // Fallback to DB seamlessly if Redis errors out
  }
};

/**
 * Store user profile in Redis cache
 * @param {string} userId
 * @param {object} profileData
 */
const setCachedProfile = async (userId, profileData) => {
  try {
    const key = getProfileCacheKey(userId);
    await redis.set(key, JSON.stringify(profileData), 'EX', PROFILE_CACHE_TTL);
    logger.info(`[Cache SET] Profile stored in Redis for userId: ${userId} (TTL: ${PROFILE_CACHE_TTL}s)`);
  } catch (error) {
    logger.warn(`Redis SET profile cache failed: ${error.message}`);
  }
};

/**
 * Invalidate/delete cached profile from Redis (on update/delete)
 * @param {string} userId
 */
const invalidateCachedProfile = async (userId) => {
  try {
    const key = getProfileCacheKey(userId);
    await redis.del(key);
    logger.info(`[Cache EVICT] Profile key deleted from Redis for userId: ${userId}`);
  } catch (error) {
    logger.warn(`Redis DEL profile cache failed: ${error.message}`);
  }
};

module.exports = {
  getCachedProfile,
  setCachedProfile,
  invalidateCachedProfile,
};
