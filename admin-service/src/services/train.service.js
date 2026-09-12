const prisma = require('../config/prisma');
const { publishTrainCreatedEvent } = require('../producers/admin.producer');

/**
 * Helper to determine Indian Railways Seat Type based on seat number sequence (8-berth modulo pattern)
 * 1: LOWER, 2: MIDDLE, 3: UPPER, 4: LOWER, 5: MIDDLE, 6: UPPER, 7: SIDE_LOWER, 8 (0): SIDE_UPPER
 */
const determineSeatType = (seatNumber) => {
  const mod = seatNumber % 8;
  if (mod === 1 || mod === 4) return 'LOWER';
  if (mod === 2 || mod === 5) return 'MIDDLE';
  if (mod === 3 || mod === 6) return 'UPPER';
  if (mod === 7) return 'SIDE_LOWER';
  return 'SIDE_UPPER'; // mod === 0
};

/**
 * Creates a train with coaches and automatically generates individual seat records inside a Prisma transaction
 */
const createTrain = async ({ number, name, routeId, coaches }) => {
  const formattedNumber = number.trim();

  // 1. Validate Unique Train Number
  const existingTrain = await prisma.train.findUnique({ where: { number: formattedNumber } });
  if (existingTrain) {
    const error = new Error(`Train with number '${formattedNumber}' already exists`);
    error.statusCode = 400;
    throw error;
  }

  // 2. Validate Route exists
  const route = await prisma.route.findUnique({ where: { id: routeId } });
  if (!route) {
    const error = new Error('Specified routeId does not exist');
    error.statusCode = 400;
    throw error;
  }

  if (!coaches || !Array.isArray(coaches) || coaches.length === 0) {
    const error = new Error('Train creation requires at least 1 coach configuration');
    error.statusCode = 400;
    throw error;
  }

  // 3. Perform Train, Coach & Automatic Seat Generation in a Transaction
  const createdTrain = await prisma.$transaction(async (tx) => {
    const newTrain = await tx.train.create({
      data: {
        number: formattedNumber,
        name: name.trim(),
        routeId,
        totalCoaches: coaches.length,
      },
    });

    const createdSeats = [];

    for (const coachConfig of coaches) {
      const coachName = coachConfig.name.trim(); // e.g. B1
      const coachType = coachConfig.coachType || '3AC';
      const totalSeats = coachConfig.totalSeats || 72;
      const pricePerSeat = coachConfig.pricePerSeat || 1200.00;

      const createdCoach = await tx.coach.create({
        data: {
          trainId: newTrain.id,
          name: coachName,
          coachType,
          totalSeats,
        },
      });

      // Automatic seat generation algorithm
      for (let i = 1; i <= totalSeats; i++) {
        createdSeats.push({
          trainId: newTrain.id,
          coachId: createdCoach.id,
          seatNumber: `${coachName}-${i}`, // e.g. B1-1
          seatType: determineSeatType(i),
          price: pricePerSeat,
        });
      }
    }

    // Bulk insert all generated seats
    await tx.seat.createMany({
      data: createdSeats,
    });

    return tx.train.findUnique({
      where: { id: newTrain.id },
      include: {
        route: {
          include: {
            sourceStation: true,
            destinationStation: true,
          },
        },
        coaches: true,
        _count: {
          select: { seats: true },
        },
      },
    });
  });

  // Publish Kafka Event
  await publishTrainCreatedEvent(createdTrain);

  return createdTrain;
};

/**
 * Retrieves all trains with coach counts and route information
 */
const getAllTrains = async () => {
  return prisma.train.findMany({
    include: {
      route: {
        include: {
          sourceStation: true,
          destinationStation: true,
        },
      },
      coaches: true,
      _count: {
        select: { seats: true, schedules: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

module.exports = {
  createTrain,
  getAllTrains,
};
