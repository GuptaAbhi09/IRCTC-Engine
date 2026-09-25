const config = require('../config');
const logger = require('../config/logger');

const inventoryBaseUrl = config.services.inventoryServiceUrl;

/**
 * Call Inventory Service to hold seat segments (Status AVAILABLE -> LOCKED)
 */
const holdInventorySeats = async (scheduleId, seatIds, fromSequenceNum, toSequenceNum, bookingId) => {
  try {
    const response = await fetch(`${inventoryBaseUrl}/api/v1/inventory/hold-seats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduleId, seatIds, fromSequenceNum, toSequenceNum, bookingId })
    });

    if (!response.ok) {
      throw new Error(`Inventory Service returned HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.count > 0;
  } catch (error) {
    logger.error(`[INVENTORY CLIENT ERROR] holdSeats failed: ${error.message}`);
    return false;
  }
};

/**
 * Call Inventory Service to unlock seat segments (Status LOCKED -> AVAILABLE)
 */
const unlockInventorySeats = async (scheduleId, seatIds, fromSequenceNum, toSequenceNum) => {
  try {
    const response = await fetch(`${inventoryBaseUrl}/api/v1/inventory/unlock-seats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduleId, seatIds, fromSequenceNum, toSequenceNum })
    });

    const data = await response.json();
    return data.count > 0;
  } catch (error) {
    logger.error(`[INVENTORY CLIENT ERROR] unlockSeats failed: ${error.message}`);
    return false;
  }
};

/**
 * Call Inventory Service to confirm seat segments (Status LOCKED -> BOOKED)
 */
const confirmInventorySeats = async (scheduleId, seatIds, fromSequenceNum, toSequenceNum, bookingId) => {
  try {
    const response = await fetch(`${inventoryBaseUrl}/api/v1/inventory/confirm-seats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduleId, seatIds, fromSequenceNum, toSequenceNum, bookingId })
    });

    const data = await response.json();
    return data.count > 0;
  } catch (error) {
    logger.error(`[INVENTORY CLIENT ERROR] confirmSeats failed: ${error.message}`);
    return false;
  }
};

module.exports = { holdInventorySeats, unlockInventorySeats, confirmInventorySeats };
