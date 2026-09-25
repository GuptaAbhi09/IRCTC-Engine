const prisma = require('../config/db');
const { producer } = require('../config/kafka');

/**
 * Check seat availability for a schedule between source and destination stations
 */
const getSeatAvailability = async (scheduleId, fromStationId, toStationId) => {
  const schedId = parseInt(scheduleId);
  const srcId = parseInt(fromStationId);
  const destId = parseInt(toStationId);

  // 1. Fetch route stations to get sequence numbers
  const schedule = await prisma.seatInventory.findFirst({
    where: { scheduleId: schedId }
  });

  if (!schedule) {
    throw new Error('No inventory found for the specified schedule');
  }

  // Fetch route station sequence numbers from admin API / DB proxy query
  // For segment matching: query range between fromSeq and toSeq
  const routeStations = await prisma.$queryRaw`
    SELECT "stationId", "sequenceNum" 
    FROM "RouteStation" rs
    JOIN "Schedule" s ON s."routeId" = rs."routeId"
    WHERE s.id = ${schedId} AND "stationId" IN (${srcId}, ${destId})
  `;

  if (!routeStations || routeStations.length < 2) {
    throw new Error('Invalid origin or destination station for this schedule route');
  }

  const srcStation = routeStations.find(s => s.stationId === srcId);
  const destStation = routeStations.find(s => s.stationId === destId);

  if (srcStation.sequenceNum >= destStation.sequenceNum) {
    throw new Error('Origin station must come before destination station on the route');
  }

  const fromSeq = srcStation.sequenceNum;
  const toSeq = destStation.sequenceNum;
  const requiredSegmentsCount = toSeq - fromSeq;

  // 2. Query physical seats available for ALL required hops
  const availableSeatGroups = await prisma.$queryRaw`
    SELECT "seatId"
    FROM "SeatInventory"
    WHERE "scheduleId" = ${schedId}
      AND "fromSequenceNum" >= ${fromSeq}
      AND "toSequenceNum" <= ${toSeq}
      AND "status" = 'AVAILABLE'
    GROUP BY "seatId"
    HAVING COUNT("id") = ${requiredSegmentsCount}
  `;

  const availableSeatIds = availableSeatGroups.map(g => g.seatId);

  // 3. Fetch detailed seat info
  const seats = await prisma.seat.findMany({
    where: { id: { in: availableSeatIds } },
    select: {
      id: true,
      seatNumber: true,
      coachNumber: true,
      berthType: true
    }
  });

  const responseData = {
    scheduleId: schedId,
    fromStationId: srcId,
    toStationId: destId,
    fromSequenceNum: fromSeq,
    toSequenceNum: toSeq,
    totalAvailableSeats: seats.length,
    availableSeats: seats
  };

  // 4. Publish real-time availability update to Kafka for Search Service consumption
  try {
    await producer.send({
      topic: 'inventory.seat_availability.updated',
      messages: [{ value: JSON.stringify(responseData) }]
    });
  } catch (err) {
    console.error('⚠️ Failed to publish seat availability update event:', err.message);
  }

  return responseData;
};

/**
 * Hold seat segment hops for reservation (AVAILABLE -> LOCKED)
 */
const holdSeats = async (scheduleId, seatIds, fromSequenceNum, toSequenceNum, bookingId) => {
  const result = await prisma.seatInventory.updateMany({
    where: {
      scheduleId: parseInt(scheduleId),
      seatId: { in: seatIds.map(id => parseInt(id)) },
      fromSequenceNum: { gte: parseInt(fromSequenceNum) },
      toSequenceNum: { lte: parseInt(toSequenceNum) },
      status: 'AVAILABLE'
    },
    data: {
      status: 'LOCKED'
    }
  });

  return result.count;
};

/**
 * Release/Unlock seat segment hops (LOCKED -> AVAILABLE)
 */
const unlockSeats = async (scheduleId, seatIds, fromSequenceNum, toSequenceNum) => {
  const result = await prisma.seatInventory.updateMany({
    where: {
      scheduleId: parseInt(scheduleId),
      seatId: { in: seatIds.map(id => parseInt(id)) },
      fromSequenceNum: { gte: parseInt(fromSequenceNum) },
      toSequenceNum: { lte: parseInt(toSequenceNum) },
      status: 'LOCKED'
    },
    data: {
      status: 'AVAILABLE'
    }
  });

  return result.count;
};

module.exports = { getSeatAvailability, holdSeats, unlockSeats };

