const routeService = require('../services/route.service');

const createRouteHandler = async (req, res, next) => {
  try {
    const { name, sourceStationId, destinationStationId, stations } = req.body;

    if (!name || !sourceStationId || !destinationStationId || !stations) {
      return res.status(400).json({
        success: false,
        message: 'name, sourceStationId, destinationStationId, and stations array are required',
      });
    }

    const route = await routeService.createRoute({
      name,
      sourceStationId,
      destinationStationId,
      stations,
    });

    return res.status(201).json({
      success: true,
      message: 'Route created successfully with intermediate stations',
      data: { route },
    });
  } catch (error) {
    next(error);
  }
};

const getAllRoutesHandler = async (req, res, next) => {
  try {
    const routes = await routeService.getAllRoutes();
    return res.status(200).json({
      success: true,
      count: routes.length,
      data: { routes },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRouteHandler,
  getAllRoutesHandler,
};
