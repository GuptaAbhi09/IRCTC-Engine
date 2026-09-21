const { esClient } = require('../config/elasticsearch');
const logger = require('../config/logger');
const { STATIONS_INDEX, TRAINS_INDEX } = require('../indexers/mapping.indexer');

/**
 * Station Typeahead Auto-Complete Search
 * Matches partial prefixes against station name and city fields using n-gram analyzer
 * @param {string} searchQuery Partial user input string (e.g. "ND", "delhi")
 */
const searchStations = async (searchQuery) => {
  if (!searchQuery || searchQuery.trim() === '') {
    return [];
  }

  const queryText = searchQuery.trim().toLowerCase();

  const response = await esClient.search({
    index: STATIONS_INDEX,
    body: {
      query: {
        bool: {
          should: [
            {
              term: {
                code: queryText.toUpperCase(),
              },
            },
            {
              multi_match: {
                query: queryText,
                fields: ['name^3', 'city^2'], // Boost name matches 3x and city matches 2x
                fuzziness: 'AUTO',
              },
            },
          ],
        },
      },
      size: 10,
    },
  });

  return response.hits.hits.map((hit) => hit._source);
};

/**
 * Fuzzy Train & Route Search
 * Searches trains by name/number with typo tolerance, or matches intermediate route stations sequence
 * @param {object} params { query, source, destination }
 */
const searchTrains = async ({ query, source, destination }) => {
  const mustClauses = [];

  // 1. Optional Name or Train Number search with Fuzziness
  if (query && query.trim() !== '') {
    const q = query.trim();
    mustClauses.push({
      bool: {
        should: [
          { term: { number: q } },
          {
            match: {
              name: {
                query: q,
                fuzziness: 'AUTO',
              },
            },
          },
        ],
      },
    });
  }

  // 2. Source Station Match (via Code or ID)
  if (source && source.trim() !== '') {
    const src = source.trim().toUpperCase();
    mustClauses.push({
      bool: {
        should: [
          { term: { 'sourceStation.code': src } },
          {
            nested: {
              path: 'routeStations',
              query: {
                term: { 'routeStations.stationId': source },
              },
            },
          },
        ],
      },
    });
  }

  // 3. Destination Station Match (via Code or ID)
  if (destination && destination.trim() !== '') {
    const dest = destination.trim().toUpperCase();
    mustClauses.push({
      bool: {
        should: [
          { term: { 'destinationStation.code': dest } },
          {
            nested: {
              path: 'routeStations',
              query: {
                term: { 'routeStations.stationId': destination },
              },
            },
          },
        ],
      },
    });
  }

  const response = await esClient.search({
    index: TRAINS_INDEX,
    body: {
      query: mustClauses.length > 0 ? { bool: { must: mustClauses } } : { match_all: {} },
      size: 20,
    },
  });

  return response.hits.hits.map((hit) => hit._source);
};

module.exports = {
  searchStations,
  searchTrains,
};
