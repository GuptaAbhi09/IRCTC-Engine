const scheduleService = require('../services/schedule.service');

const createScheduleHandler = async (req, res, next) => {
  try {
    const { trainId, departureDate } = req.body;

    if (!trainId || !departureDate) {
      return res.status(400).json({
        success: false,
        message: 'trainId and departureDate are required',
      });
    }

    const schedule = await scheduleService.createSchedule({ trainId, departureDate });

    return res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      data: { schedule },
    });
  } catch (error) {
    next(error);
  }
};

const getSchedulesHandler = async (req, res, next) => {
  try {
    const { trainId } = req.params;
    const schedules = await scheduleService.getSchedulesByTrainId(trainId);

    return res.status(200).json({
      success: true,
      count: schedules.length,
      data: { schedules },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createScheduleHandler,
  getSchedulesHandler,
};
