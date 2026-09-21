const express = require('express');
const { searchStationsHandler, searchTrainsHandler } = require('../controllers/search.controller');

const router = express.Router();

// Route 1: Station Typeahead Auto-Complete
router.get('/stations', searchStationsHandler);

// Route 2: Fuzzy Train & Route Search
router.get('/trains', searchTrainsHandler);

module.exports = router;
