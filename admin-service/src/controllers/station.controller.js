const stationService = require('../services/station.service');

const createStationHandler = async (req, res, next) => {
  try {
    const { name, code, city, state } = req.body;

    if (!name || !code || !city || !state) {
      return res.status(400).json({
        success: false,
        message: 'All fields (name, code, city, state) are required',
      });
    }

    const station = await stationService.createStation({ name, code, city, state });

    return res.status(201).json({
      success: true,
      message: 'Station created successfully',
      data: { station },
    });
  } catch (error) {
    next(error);
  }
};

const getAllStationsHandler = async (req, res, next) => {
  try {
    const stations = await stationService.getAllStations();
    return res.status(200).json({
      success: true,
      count: stations.length,
      data: { stations },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStationHandler,
  getAllStationsHandler,
};
