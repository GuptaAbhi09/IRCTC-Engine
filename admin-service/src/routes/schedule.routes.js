const express = require('express');
const { createScheduleHandler, getSchedulesHandler } = require('../controllers/schedule.controller');

const router = express.Router();

router.post('/', createScheduleHandler);
router.get('/train/:trainId', getSchedulesHandler);

module.exports = router;
