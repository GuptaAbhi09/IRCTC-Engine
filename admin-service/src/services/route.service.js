const prisma = require('../config/prisma');

/**
 * Creates a route along with its ordered sequence of intermediate stations
 */
const createRoute = async ({ name, sourceStationId, destinationStationId, stations }) => {
  // 1. Validate Source and Destination Stations exist
  const sourceStation = await prisma.station.findUnique({ where: { id: sourceStationId } });
  const destStation = await prisma.station.findUnique({ where: { id: destinationStationId } });

  if (!sourceStation || !destStation) {
    const error = new Error('Invalid source or destination station ID');
    error.statusCode = 400;
    throw error;
  }

  if (!stations || !Array.isArray(stations) || stations.length < 2) {
    const error = new Error('A route must contain at least 2 station stops');
    error.statusCode = 400;
    throw error;
  }

  // 2. Perform route creation and station linking in a single transaction
  const route = await prisma.$transaction(async (tx) => {
    const newRoute = await tx.route.create({
      data: {
        name: name.trim(),
        sourceStationId,
        destinationStationId,
      },
    });

    const routeStationData = stations.map((st) => ({
      routeId: newRoute.id,
      stationId: st.stationId,
      sequenceNum: st.sequenceNum,
      arrivalTime: st.arrivalTime || null,
      departureTime: st.departureTime || null,
      distanceFromOriginKm: st.distanceFromOriginKm || 0.0,
    }));

    await tx.routeStation.createMany({
      data: routeStationData,
    });

    return tx.route.findUnique({
      where: { id: newRoute.id },
      include: {
        sourceStation: true,
        destinationStation: true,
        routeStations: {
          include: { station: true },
          orderBy: { sequenceNum: 'asc' },
        },
      },
    });
  });

  return route;
};

/**
 * Retrieves all routes with their station sequences
 */
const getAllRoutes = async () => {
  return prisma.route.findMany({
    include: {
      sourceStation: true,
      destinationStation: true,
      routeStations: {
        include: { station: true },
        orderBy: { sequenceNum: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

module.exports = {
  createRoute,
  getAllRoutes,
};
