const express = require('express');
const { createStationHandler, getAllStationsHandler } = require('../controllers/station.controller');

const router = express.Router();

router.post('/', createStationHandler);
router.get('/', getAllStationsHandler);

module.exports = router;
