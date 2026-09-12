const express = require('express');
const stationRoutes = require('./station.routes');
const routeRoutes = require('./route.routes');
const trainRoutes = require('./train.routes');
const scheduleRoutes = require('./schedule.routes');

const router = express.Router();

router.use('/stations', stationRoutes);
router.use('/routes', routeRoutes);
router.use('/trains', trainRoutes);
router.use('/schedules', scheduleRoutes);

module.exports = router;
