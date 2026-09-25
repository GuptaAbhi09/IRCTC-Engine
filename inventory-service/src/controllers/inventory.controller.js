const inventoryService = require('../services/inventory.service');

const getAvailability = async (req, res, next) => {
  try {
    const { scheduleId, fromStationId, toStationId } = req.query;

    if (!scheduleId || !fromStationId || !toStationId) {
      return res.status(400).json({
        success: false,
        message: 'scheduleId, fromStationId, and toStationId query parameters are required'
      });
    }

    const availabilityData = await inventoryService.getSeatAvailability(
      scheduleId,
      fromStationId,
      toStationId
    );

    res.status(200).json({
      success: true,
      data: availabilityData
    });
  } catch (error) {
    next(error);
  }
};

const holdSeats = async (req, res, next) => {
  try {
    const { scheduleId, seatIds, fromSequenceNum, toSequenceNum, bookingId } = req.body;
    const count = await inventoryService.holdSeats(scheduleId, seatIds, fromSequenceNum, toSequenceNum, bookingId);
    res.status(200).json({ success: true, count });
  } catch (error) {
    next(error);
  }
};

const unlockSeats = async (req, res, next) => {
  try {
    const { scheduleId, seatIds, fromSequenceNum, toSequenceNum } = req.body;
    const count = await inventoryService.unlockSeats(scheduleId, seatIds, fromSequenceNum, toSequenceNum);
    res.status(200).json({ success: true, count });
  } catch (error) {
    next(error);
  }
};

const confirmSeats = async (req, res, next) => {
  try {
    const { scheduleId, seatIds, fromSequenceNum, toSequenceNum, bookingId } = req.body;
    const count = await inventoryService.confirmSeats(scheduleId, seatIds, fromSequenceNum, toSequenceNum, bookingId);
    res.status(200).json({ success: true, count });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAvailability, holdSeats, unlockSeats, confirmSeats };


