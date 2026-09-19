const { esClient } = require('../config/elasticsearch');
const logger = require('../config/logger');

const STATIONS_INDEX = 'stations_index';
const TRAINS_INDEX = 'trains_index';

/**
 * Initializes ElasticSearch Indices and custom n-gram analyzers/mappings for Stations and Trains
 */
const initializeIndicesAndMappings = async () => {
  try {
    // 1. Initialize stations_index with Edge N-Gram analyzer for Auto-Complete typeahead
    const stationsIndexExists = await esClient.indices.exists({ index: STATIONS_INDEX });
    if (!stationsIndexExists) {
      await esClient.indices.create({
        index: STATIONS_INDEX,
        body: {
          settings: {
            analysis: {
              analyzer: {
                autocomplete_analyzer: {
                  type: 'custom',
                  tokenizer: 'autocomplete_tokenizer',
                  filter: ['lowercase'],
                },
              },
              tokenizer: {
                autocomplete_tokenizer: {
                  type: 'edge_ngram',
                  min_gram: 1,
                  max_gram: 20,
                  token_chars: ['letter', 'digit'],
                },
              },
            },
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              code: { type: 'keyword' },
              name: {
                type: 'text',
                analyzer: 'autocomplete_analyzer',
                search_analyzer: 'standard',
              },
              city: {
                type: 'text',
                analyzer: 'autocomplete_analyzer',
                search_analyzer: 'standard',
              },
              state: { type: 'text' },
            },
          },
        },
      });
      logger.info(`[SEARCH-SERVICE] ElasticSearch Index [${STATIONS_INDEX}] created with n-gram analyzer`);
    }

    // 2. Initialize trains_index for Fuzzy Search
    const trainsIndexExists = await esClient.indices.exists({ index: TRAINS_INDEX });
    if (!trainsIndexExists) {
      await esClient.indices.create({
        index: TRAINS_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              number: { type: 'keyword' },
              name: { type: 'text' },
              sourceStation: {
                properties: {
                  id: { type: 'keyword' },
                  code: { type: 'keyword' },
                  name: { type: 'text' },
                  city: { type: 'text' },
                },
              },
              destinationStation: {
                properties: {
                  id: { type: 'keyword' },
                  code: { type: 'keyword' },
                  name: { type: 'text' },
                  city: { type: 'text' },
                },
              },
              routeStations: {
                type: 'nested',
                properties: {
                  stationId: { type: 'keyword' },
                  sequenceNum: { type: 'integer' },
                  arrivalTime: { type: 'keyword' },
                  departureTime: { type: 'keyword' },
                  distanceFromOriginKm: { type: 'float' },
                },
              },
            },
          },
        },
      });
      logger.info(`[SEARCH-SERVICE] ElasticSearch Index [${TRAINS_INDEX}] created successfully`);
    }
  } catch (error) {
    logger.error(`[SEARCH-SERVICE] Index initialization error: ${error.message}`);
  }
};

module.exports = {
  STATIONS_INDEX,
  TRAINS_INDEX,
  initializeIndicesAndMappings,
};
