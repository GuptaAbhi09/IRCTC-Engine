const redis = require('../config/redis');
const logger = require('../config/logger');

/**
 * Lua script to acquire locks on multiple contiguous seat segments atomically.
 * KEYS: Array of base hop lock keys (e.g., ["lock:s12:seat5:1:2", "lock:s12:seat5:2:3"])
 * ARGV[1]: Lock Owner UUID
 * ARGV[2]: TTL in milliseconds (e.g., 600000 = 10 mins)
 */
const ACQUIRE_LOCK_LUA = `
  for i, key in ipairs(KEYS) do
    if redis.call("EXISTS", key) == 1 then
      return 0
    end
  end
  for i, key in ipairs(KEYS) do
    redis.call("SET", key, ARGV[1], "PX", ARGV[2])
  end
  return 1
`;

/**
 * Lua script to safely release locks owned by a specific lock owner UUID.
 * Ensures User A cannot unlock User B's seat!
 * KEYS: Array of base hop lock keys
 * ARGV[1]: Lock Owner UUID
 */
const RELEASE_LOCK_LUA = `
  local releasedCount = 0
  for i, key in ipairs(KEYS) do
    if redis.call("GET", key) == ARGV[1] then
      redis.call("DEL", key)
      releasedCount = releasedCount + 1
    end
  end
  return releasedCount
`;

/**
 * Generate lock keys for seats across contiguous sequence hops
 * @param {number} scheduleId 
 * @param {Array<number>} seatIds 
 * @param {number} fromSeq 
 * @param {number} toSeq 
 * @returns {Array<string>} Array of atomic hop lock keys
 */
const generateLockKeys = (scheduleId, seatIds, fromSeq, toSeq) => {
  const keys = [];
  for (const seatId of seatIds) {
    for (let hop = fromSeq; hop < toSeq; hop++) {
      keys.push(`lock:sched:${scheduleId}:seat:${seatId}:hop:${hop}:${hop + 1}`);
    }
  }
  return keys;
};

/**
 * Atomically acquire distributed seat locks for given segments
 * @param {Array<string>} lockKeys Array of lock keys
 * @param {string} ownerUuid Unique Lock Owner Identifier
 * @param {number} ttlMs Time to live in milliseconds (Default: 10 mins)
 * @returns {Promise<boolean>} True if locks acquired, false otherwise
 */
const acquireSeatLocks = async (lockKeys, ownerUuid, ttlMs = 600000) => {
  if (!lockKeys || lockKeys.length === 0) return true;

  try {
    logger.debug(`[REDIS LOCK] Attempting lock for ${lockKeys.length} hop keys by Owner: ${ownerUuid}`);
    
    // Correct Redis EVAL argument order:
    // redis.eval(script, numKeys, ...keys, ...args)
    const result = await redis.eval(
      ACQUIRE_LOCK_LUA,
      lockKeys.length,
      ...lockKeys,
      ownerUuid,
      ttlMs.toString()
    );

    return result === 1;
  } catch (error) {
    logger.error(`[REDIS LOCK ERROR] Failed acquiring locks: ${error.message}`);
    return false;
  }
};

/**
 * Release seat locks owned by ownerUuid
 * @param {Array<string>} lockKeys Array of lock keys
 * @param {string} ownerUuid Unique Lock Owner Identifier
 * @returns {Promise<number>} Number of keys released
 */
const releaseSeatLocks = async (lockKeys, ownerUuid) => {
  if (!lockKeys || lockKeys.length === 0) return 0;

  try {
    const releasedCount = await redis.eval(
      RELEASE_LOCK_LUA,
      lockKeys.length,
      ...lockKeys,
      ownerUuid
    );

    logger.debug(`[REDIS LOCK RELEASE] Released ${releasedCount} keys for Owner: ${ownerUuid}`);
    return releasedCount;
  } catch (error) {
    logger.error(`[REDIS LOCK ERROR] Failed releasing locks: ${error.message}`);
    return 0;
  }
};

module.exports = {
  generateLockKeys,
  acquireSeatLocks,
  releaseSeatLocks,
};
