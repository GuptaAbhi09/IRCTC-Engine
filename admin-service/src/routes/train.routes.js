const express = require('express');
const { createTrainHandler, getAllTrainsHandler } = require('../controllers/train.controller');

const router = express.Router();

router.post('/', createTrainHandler);
router.get('/', getAllTrainsHandler);

module.exports = router;
