const searchService = require('../services/search.service');

/**
 * Controller for GET /api/v1/search/stations?q=...
 */
const searchStationsHandler = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Query parameter ?q= is required for station search',
      });
    }

    const stations = await searchService.searchStations(q);

    return res.status(200).json({
      success: true,
      count: stations.length,
      data: { stations },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller for GET /api/v1/search/trains?query=...&source=...&destination=...
 */
const searchTrainsHandler = async (req, res, next) => {
  try {
    const { query, source, destination } = req.query;

    const trains = await searchService.searchTrains({ query, source, destination });

    return res.status(200).json({
      success: true,
      count: trains.length,
      data: { trains },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchStationsHandler,
  searchTrainsHandler,
};
