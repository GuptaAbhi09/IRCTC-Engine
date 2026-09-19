const { Client } = require('@elastic/elasticsearch');
const config = require('./index');
const logger = require('./logger');

const esClient = new Client({
  node: config.elasticsearchNode,
});

const connectElasticSearch = async () => {
  try {
    const health = await esClient.cluster.health();
    logger.info(`[SEARCH-SERVICE] ElasticSearch Connected. Cluster Health: ${health.status}`);
  } catch (error) {
    logger.error(`[SEARCH-SERVICE] ElasticSearch Connection Error: ${error.message}`);
  }
};

module.exports = {
  esClient,
  connectElasticSearch,
};
