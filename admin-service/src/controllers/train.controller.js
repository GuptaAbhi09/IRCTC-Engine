const trainService = require('../services/train.service');

const createTrainHandler = async (req, res, next) => {
  try {
    const { number, name, routeId, coaches } = req.body;

    if (!number || !name || !routeId || !coaches) {
      return res.status(400).json({
        success: false,
        message: 'Train number, name, routeId, and coaches array are required',
      });
    }

    const train = await trainService.createTrain({
      number,
      name,
      routeId,
      coaches,
    });

    return res.status(201).json({
      success: true,
      message: 'Train created successfully with automatically generated seats',
      data: { train },
    });
  } catch (error) {
    next(error);
  }
};

const getAllTrainsHandler = async (req, res, next) => {
  try {
    const trains = await trainService.getAllTrains();
    return res.status(200).json({
      success: true,
      count: trains.length,
      data: { trains },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTrainHandler,
  getAllTrainsHandler,
};
