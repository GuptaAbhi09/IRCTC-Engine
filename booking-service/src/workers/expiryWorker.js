const prisma = require('../config/db');
const logger = require('../config/logger');
const { unlockInventorySeats } = require('../services/inventoryClient');
const { generateLockKeys, releaseSeatLocks } = require('../utils/redisLock');

const EXPIRY_CHECK_INTERVAL_MS = 60000; // Run every 60 seconds

/**
 * Scans PostgreSQL for expired pending reservations & executes compensating transactions
 */
const checkAndExpireBookings = async () => {
  try {
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: { in: ['SEATS_HELD', 'PAYMENT_PENDING'] },
        expiresAt: { lt: new Date() }
      },
      include: { passengers: true }
    });

    if (expiredBookings.length === 0) return;

    logger.info(`[EXPIRY WORKER] Found ${expiredBookings.length} expired reservations to clean up.`);

    for (const booking of expiredBookings) {
      // 1. CAS Update status to EXPIRED
      const updated = await prisma.booking.updateMany({
        where: {
          id: booking.id,
          status: { in: ['SEATS_HELD', 'PAYMENT_PENDING'] }
        },
        data: { status: 'EXPIRED' }
      });

      if (updated.count > 0) {
        const seatIds = booking.passengers.map(p => p.seatId);

        // 2. Compensating Transaction: Unlock Inventory Hops in PostgreSQL (LOCKED -> AVAILABLE)
        await unlockInventorySeats(booking.scheduleId, seatIds, booking.fromStationId, booking.toStationId);

        // 3. Compensating Transaction: Release Redis Distributed Locks
        const lockKeys = generateLockKeys(booking.scheduleId, seatIds, booking.fromStationId, booking.toStationId);
        await releaseSeatLocks(lockKeys, booking.idempotencyKey);

        logger.info(`[EXPIRY WORKER SUCCESS] Cleaned up expired Booking ${booking.id} (PNR: ${booking.pnr})`);
      }
    }
  } catch (error) {
    logger.error(`[EXPIRY WORKER ERROR] ${error.message}`);
  }
};

/**
 * Starts the Expiry Worker interval loop
 */
const startExpiryWorker = () => {
  logger.info('🚀 Expiry Worker started (running every 60s)');
  setInterval(checkAndExpireBookings, EXPIRY_CHECK_INTERVAL_MS);
};

module.exports = { startExpiryWorker, checkAndExpireBookings };
