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

/**
 * Call payment-service to create Razorpay Order & CAS update state to PAYMENT_PENDING (SAGA Step 2)
 */
const createPaymentOrderForBooking = async (bookingId) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId }
  });

  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 444;
    throw err;
  }

  if (booking.expiresAt < new Date()) {
    const err = new Error('Reservation timer expired for this booking. Please search and reserve again.');
    err.statusCode = 400;
    throw err;
  }

  const paymentServiceUrl = require('../config').services.paymentServiceUrl;

  const response = await fetch(`${paymentServiceUrl}/api/v1/payments/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId: booking.id, amount: booking.totalAmount, pnr: booking.pnr })
  });

  if (!response.ok) {
    throw new Error('Failed to create payment order in Payment Service');
  }

  const { data } = await response.json();

  // CAS Update: SEATS_HELD -> PAYMENT_PENDING
  const updatedBooking = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: 'PAYMENT_PENDING',
      razorpayOrderId: data.orderId
    }
  });

  logger.info(`[SAGA STEP 2 SUCCESS] Booking ${booking.id} status updated to PAYMENT_PENDING with Razorpay Order ${data.orderId}`);

    return {
    bookingId: booking.id,
    pnr: booking.pnr,
    razorpayOrderId: data.orderId,
    amount: data.amount,
    currency: data.currency,
    expiresAt: booking.expiresAt
  };
};

/**
 * Confirm booking, update inventory to BOOKED, release Redis locks, and publish Kafka confirmation (SAGA Step 3)
 */
const confirmBooking = async (bookingId) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { passengers: true }
  });

  if (!booking) {
    logger.warn(`[CONFIRM BOOKING ERROR] Booking ${bookingId} not found`);
    return;
  }

  const { confirmInventorySeats } = require('./inventoryClient');
  const { producer } = require('../config/kafka');
  const seatIds = booking.passengers.map(p => p.seatId);

  // 1. Confirm seats in Inventory Service (LOCKED -> BOOKED)
  await confirmInventorySeats(booking.scheduleId, seatIds, booking.fromStationId, booking.toStationId, booking.id);

  // 2. CAS Update Booking status to CONFIRMED
  const confirmedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CONFIRMED' },
    include: { passengers: true }
  });

  // 3. Force release Redis Distributed Locks
  const lockKeys = generateLockKeys(booking.scheduleId, seatIds, booking.fromStationId, booking.toStationId);
  await releaseSeatLocks(lockKeys, booking.idempotencyKey);

  logger.info(`[SAGA STEP 3 COMPLETE] 🎉 Booking ${booking.id} (PNR: ${booking.pnr}) is officially CONFIRMED!`);

  // 4. Publish booking.ticket.confirmed to Kafka for Notification Service
  try {
    await producer.send({
      topic: 'booking.ticket.confirmed',
      messages: [{ value: JSON.stringify(confirmedBooking) }]
    });
    logger.info(`[KAFKA BROADCAST] Published booking.ticket.confirmed for PNR ${booking.pnr}`);
  } catch (err) {
    logger.error(`[KAFKA ERROR] Failed to publish confirmation event: ${err.message}`);
  }

  return confirmedBooking;
};

module.exports = { reserveSeats, createPaymentOrderForBooking, confirmBooking };


