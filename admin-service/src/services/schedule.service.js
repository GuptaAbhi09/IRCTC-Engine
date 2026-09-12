const prisma = require('../config/prisma');
const { publishScheduleCreatedEvent } = require('../producers/admin.producer');

/**
 * Creates a schedule (trip departure date) for a specific train
 */
const createSchedule = async ({ trainId, departureDate }) => {
  const train = await prisma.train.findUnique({ where: { id: trainId } });
  if (!train) {
    const error = new Error('Train not found');
    error.statusCode = 404;
    throw error;
  }

  const parsedDate = new Date(departureDate);
  if (isNaN(parsedDate.getTime())) {
    const error = new Error('Invalid departure date format');
    error.statusCode = 400;
    throw error;
  }

  const existingSchedule = await prisma.schedule.findUnique({
    where: {
      trainId_departureDate: {
        trainId,
        departureDate: parsedDate,
      },
    },
  });

  if (existingSchedule) {
    const error = new Error('A schedule for this train on the specified date already exists');
    error.statusCode = 400;
    throw error;
  }

  const schedule = await prisma.schedule.create({
    data: {
      trainId,
      departureDate: parsedDate,
      status: 'ACTIVE',
    },
    include: {
      train: true,
    },
  });

  // Publish Kafka Event
  await publishScheduleCreatedEvent(schedule);

  return schedule;
};

/**
 * Retrieves all schedules for a train
 */
const getSchedulesByTrainId = async (trainId) => {
  return prisma.schedule.findMany({
    where: { trainId },
    orderBy: { departureDate: 'asc' },
  });
};

module.exports = {
  createSchedule,
  getSchedulesByTrainId,
};
