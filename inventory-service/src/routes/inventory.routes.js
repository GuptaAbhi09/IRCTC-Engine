const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');

// GET /api/v1/inventory/availability?scheduleId=1&fromStationId=101&toStationId=103
router.get('/availability', inventoryController.getAvailability);

// Internal SAGA Routes
router.post('/hold-seats', inventoryController.holdSeats);
router.post('/unlock-seats', inventoryController.unlockSeats);
router.post('/confirm-seats', inventoryController.confirmSeats);

module.exports = router;


