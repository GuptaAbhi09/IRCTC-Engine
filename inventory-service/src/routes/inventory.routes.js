const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');

// GET /api/v1/inventory/availability?scheduleId=1&fromStationId=101&toStationId=103
router.get('/availability', inventoryController.getAvailability);

module.exports = router;
