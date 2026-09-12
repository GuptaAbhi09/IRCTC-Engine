const { producer } = require('../config/kafka');
const logger = require('../config/logger');

const TOPICS = {
  STATION_CREATED: 'admin.station.created',
  TRAIN_CREATED: 'admin.train.created',
  SCHEDULE_CREATED: 'admin.schedule.created',
};

/**
 * Publishes station creation event to Kafka
 * @param {object} stationData Created station object
 */
const publishStationCreatedEvent = async (stationData) => {
  try {
    const payload = {
      eventType: 'STATION_CREATED',
      timestamp: new Date().toISOString(),
      data: stationData,
    };

    await producer.send({
      topic: TOPICS.STATION_CREATED,
      messages: [
        {
          key: stationData.id,
          value: JSON.stringify(payload),
        },
      ],
    });

    logger.info(`[KAFKA PRODUCED] Topic [${TOPICS.STATION_CREATED}] Station Code: ${stationData.code}`);
  } catch (error) {
    logger.error(`[KAFKA PRODUCER ERROR] Station event failed: ${error.message}`);
  }
};

/**
 * Publishes train creation event to Kafka
 * @param {object} trainData Created train object
 */
const publishTrainCreatedEvent = async (trainData) => {
  try {
    const payload = {
      eventType: 'TRAIN_CREATED',
      timestamp: new Date().toISOString(),
      data: trainData,
    };

    await producer.send({
      topic: TOPICS.TRAIN_CREATED,
      messages: [
        {
          key: trainData.id,
          value: JSON.stringify(payload),
        },
      ],
    });

    logger.info(`[KAFKA PRODUCED] Topic [${TOPICS.TRAIN_CREATED}] Train Number: ${trainData.number}`);
  } catch (error) {
    logger.error(`[KAFKA PRODUCER ERROR] Train event failed: ${error.message}`);
  }
};

/**
 * Publishes schedule creation event to Kafka
 * @param {object} scheduleData Created schedule object
 */
const publishScheduleCreatedEvent = async (scheduleData) => {
  try {
    const payload = {
      eventType: 'SCHEDULE_CREATED',
      timestamp: new Date().toISOString(),
      data: scheduleData,
    };

    await producer.send({
      topic: TOPICS.SCHEDULE_CREATED,
      messages: [
        {
          key: scheduleData.id,
          value: JSON.stringify(payload),
        },
      ],
    });

    logger.info(`[KAFKA PRODUCED] Topic [${TOPICS.SCHEDULE_CREATED}] Train ID: ${scheduleData.trainId}`);
  } catch (error) {
    logger.error(`[KAFKA PRODUCER ERROR] Schedule event failed: ${error.message}`);
  }
};

module.exports = {
  publishStationCreatedEvent,
  publishTrainCreatedEvent,
  publishScheduleCreatedEvent,
};
