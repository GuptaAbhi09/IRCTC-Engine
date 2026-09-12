const prisma = require('../config/prisma');
const { publishStationCreatedEvent } = require('../producers/admin.producer');

/**
 * Creates a new railway station
 */
const createStation = async ({ name, code, city, state }) => {
  const formattedCode = code.trim().toUpperCase();

  const existingStation = await prisma.station.findUnique({
    where: { code: formattedCode },
  });

  if (existingStation) {
    const error = new Error(`Station with code '${formattedCode}' already exists`);
    error.statusCode = 400;
    throw error;
  }

  const station = await prisma.station.create({
    data: {
      name: name.trim(),
      code: formattedCode,
      city: city.trim(),
      state: state.trim(),
    },
  });

  // Publish Kafka Event
  await publishStationCreatedEvent(station);

  return station;
};

/**
 * Retrieves all railway stations
 */
const getAllStations = async () => {
  return prisma.station.findMany({
    orderBy: { name: 'asc' },
  });
};

/**
 * Retrieves station details by ID
 */
const getStationById = async (stationId) => {
  const station = await prisma.station.findUnique({
    where: { id: stationId },
  });

  if (!station) {
    const error = new Error('Station not found');
    error.statusCode = 404;
    throw error;
  }

  return station;
};

module.exports = {
  createStation,
  getAllStations,
  getStationById,
};
