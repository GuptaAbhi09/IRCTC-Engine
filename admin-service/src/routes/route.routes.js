const express = require('express');
const { createRouteHandler, getAllRoutesHandler } = require('../controllers/route.controller');

const router = express.Router();

router.post('/', createRouteHandler);
router.get('/', getAllRoutesHandler);

module.exports = router;
