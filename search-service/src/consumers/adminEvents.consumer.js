const { consumer } = require('../config/kafka');
const { esClient } = require('../config/elasticsearch');
const logger = require('../config/logger');
const { STATIONS_INDEX, TRAINS_INDEX } = require('../indexers/mapping.indexer');

const TOPICS = [
  'admin.station.created',
  'admin.train.created',
];

/**
 * Indexes a new Station document into ElasticSearch stations_index
 * @param {object} stationData Station object from Kafka payload
 */
const indexStation = async (stationData) => {
  try {
    await esClient.index({
      index: STATIONS_INDEX,
      id: stationData.id,
      body: {
        id: stationData.id,
        code: stationData.code,
        name: stationData.name,
        city: stationData.city,
        state: stationData.state,
      },
      refresh: true, // Make document search-ready immediately
    });
    logger.info(`[ELASTICSEARCH INDEXED] Station Code: ${stationData.code} (ID: ${stationData.id})`);
  } catch (error) {
    logger.error(`[ELASTICSEARCH ERROR] Failed to index station ${stationData.code}: ${error.message}`);
  }
};

/**
 * Indexes a new Train document into ElasticSearch trains_index
 * @param {object} trainData Train object from Kafka payload
 */
const indexTrain = async (trainData) => {
  try {
    const routeStationsData = (trainData.route?.routeStations || []).map((rs) => ({
      stationId: rs.stationId,
      sequenceNum: rs.sequenceNum,
      arrivalTime: rs.arrivalTime,
      departureTime: rs.departureTime,
      distanceFromOriginKm: rs.distanceFromOriginKm,
    }));

    await esClient.index({
      index: TRAINS_INDEX,
      id: trainData.id,
      body: {
        id: trainData.id,
        number: trainData.number,
        name: trainData.name,
        sourceStation: trainData.route?.sourceStation ? {
          id: trainData.route.sourceStation.id,
          code: trainData.route.sourceStation.code,
          name: trainData.route.sourceStation.name,
          city: trainData.route.sourceStation.city,
        } : null,
        destinationStation: trainData.route?.destinationStation ? {
          id: trainData.route.destinationStation.id,
          code: trainData.route.destinationStation.code,
          name: trainData.route.destinationStation.name,
          city: trainData.route.destinationStation.city,
        } : null,
        routeStations: routeStationsData,
      },
      refresh: true, // Make document search-ready immediately
    });
    logger.info(`[ELASTICSEARCH INDEXED] Train Number: ${trainData.number} (Name: ${trainData.name})`);
  } catch (error) {
    logger.error(`[ELASTICSEARCH ERROR] Failed to index train ${trainData.number}: ${error.message}`);
  }
};

/**
 * Starts Kafka Consumer and listens for admin station/train creation events
 */
const startAdminEventsConsumer = async () => {
  try {
    await consumer.subscribe({ topics: TOPICS, fromBeginning: true });
    logger.info(`[SEARCH-SERVICE KAFKA] Subscribed to topics: ${TOPICS.join(', ')}`);

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const rawValue = message.value.toString();
        logger.info(`[KAFKA MESSAGE RECEIVED] Topic [${topic}] Partition [${partition}]`);

        try {
          const payload = JSON.parse(rawValue);
          const { data } = payload;

          if (topic === 'admin.station.created') {
            await indexStation(data);
          } else if (topic === 'admin.train.created') {
            await indexTrain(data);
          }
        } catch (err) {
          logger.error(`[KAFKA MESSAGE PARSE ERROR] Topic [${topic}]: ${err.message}`);
        }
      },
    });
  } catch (error) {
    logger.error(`[SEARCH-SERVICE KAFKA] Consumer run error: ${error.message}`);
  }
};

module.exports = {
  startAdminEventsConsumer,
};
