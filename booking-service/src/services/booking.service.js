const prisma = require('../config/db');
const logger = require('../config/logger');
const { generatePNR } = require('../utils/pnr');
const { generateLockKeys, acquireSeatLocks, releaseSeatLocks } = require('../utils/redisLock');
const { holdInventorySeats, unlockInventorySeats } = require('./inventoryClient');

const RESERVATION_EXPIRY_MINUTES = 10;

/**
 * Reserve seats & create a PENDING/SEATS_HELD booking (SAGA Step 1)
 */
const reserveSeats = async (userId, payload, idempotencyKey) => {
  const { scheduleId, fromStationId, toStationId, fromSequenceNum, toSequenceNum, passengers } = payload;

  if (!passengers || passengers.length === 0) {
    throw new Error('At least one passenger must be provided');
  }

  const seatIds = passengers.map(p => p.seatId);
  const lockOwnerUuid = idempotencyKey;

  // 1. Generate Redis lock keys across required sequence hops
  const lockKeys = generateLockKeys(scheduleId, seatIds, fromSequenceNum, toSequenceNum);

  // 2. Acquire Redis Distributed Lock atomically (Lua Script)
  const lockAcquired = await acquireSeatLocks(lockKeys, lockOwnerUuid, RESERVATION_EXPIRY_MINUTES * 60 * 1000);
  if (!lockAcquired) {
    const error = new Error('One or more selected seats are currently reserved by another user. Please choose different seats or try again.');
    error.statusCode = 409; // Conflict
    throw error;
  }

  // 3. Call Inventory Service to mark PostgreSQL hops as LOCKED (Compensating transaction on failure)
  const inventoryHeld = await holdInventorySeats(scheduleId, seatIds, fromSequenceNum, toSequenceNum, null);
  if (!inventoryHeld) {
    // Compensating Transaction: Release Redis Locks
    await releaseSeatLocks(lockKeys, lockOwnerUuid);
    const error = new Error('Failed to hold selected seat segments in Inventory Service.');
    error.statusCode = 400;
    throw error;
  }

  // 4. Calculate total amount (e.g. 500 per seat per hop)
  const farePerSeat = 500 * (toSequenceNum - fromSequenceNum);
  const totalAmount = passengers.length * farePerSeat;

  const pnr = generatePNR();
  const expiresAt = new Date(Date.now() + RESERVATION_EXPIRY_MINUTES * 60 * 1000);

  // 5. Create Booking and Passengers in DB inside a single transaction
  try {
    const booking = await prisma.booking.create({
      data: {
        pnr,
        userId: parseInt(userId),
        scheduleId: parseInt(scheduleId),
        fromStationId: parseInt(fromStationId),
        toStationId: parseInt(toStationId),
        totalAmount,
        status: 'SEATS_HELD',
        idempotencyKey,
        expiresAt,
        passengers: {
          create: passengers.map(p => ({
            name: p.name,
            age: parseInt(p.age),
            gender: p.gender,
            seatId: parseInt(p.seatId),
            seatNumber: p.seatNumber,
            berthType: p.berthType
          }))
        }
      },
      include: {
        passengers: true
      }
    });

    logger.info(`[SAGA STEP 1 SUCCESS] Booking ${booking.id} (PNR: ${pnr}) created in state SEATS_HELD`);

    return booking;
  } catch (dbError) {
    // Compensating Transaction on DB failure: Unlock Inventory Hops & Release Redis Locks
    logger.error(`[SAGA STEP 1 FAILURE] DB Error: ${dbError.message}. Rolling back inventory & locks...`);
    await unlockInventorySeats(scheduleId, seatIds, fromSequenceNum, toSequenceNum);
    await releaseSeatLocks(lockKeys, lockOwnerUuid);
    throw dbError;
  }
};

module.exports = { reserveSeats };
