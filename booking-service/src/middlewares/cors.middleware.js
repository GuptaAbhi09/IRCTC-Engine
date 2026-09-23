const cors = require('cors');
const config = require('../config');

const corsOptions = {
  origin: config.cors.origin,
  credentials: true,
};

module.exports = cors(corsOptions);
