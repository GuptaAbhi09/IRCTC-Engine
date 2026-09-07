const prisma = require('../config/prisma');
const { getCachedProfile, setCachedProfile, invalidateCachedProfile } = require('../utils/cache.util');

/**
 * Retrieves profile of the logged-in user with Cache-Aside strategy (Redis -> DB -> Redis)
 * @param {string} userId 
 */
const getUserProfile = async (userId) => {
  // 1. Attempt to fetch from Redis Cache
  const cachedProfile = await getCachedProfile(userId);
  if (cachedProfile) {
    return cachedProfile;
  }

  // 2. Cache Miss: Query PostgreSQL via Prisma
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      authProvider: true,
      emailVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  // 3. Save DB result to Redis for future requests
  await setCachedProfile(userId, user);

  return user;
};

/**
 * Updates profile details (firstName, lastName) of the logged-in user and evicts stale cache
 * @param {string} userId 
 * @param {object} updates { firstName, lastName }
 */
const updateUserProfile = async (userId, { firstName, lastName }) => {
  const updateData = {};
  if (firstName !== undefined) updateData.firstName = firstName.trim();
  if (lastName !== undefined) updateData.lastName = lastName.trim();

  if (Object.keys(updateData).length === 0) {
    const error = new Error('Please provide at least one field (firstName or lastName) to update');
    error.statusCode = 400;
    throw error;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      authProvider: true,
      emailVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Evict stale cached profile from Redis so next GET read gets fresh data
  await invalidateCachedProfile(userId);

  return updatedUser;
};

module.exports = {
  getUserProfile,
  updateUserProfile,
};

