const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  port: process.env.PORT || 3004,
  env: process.env.NODE_ENV || 'development',
  elasticsearchNode: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
  kafka: {
    brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
    clientId: process.env.KAFKA_CLIENT_ID || 'search-service-consumer',
    groupId: process.env.KAFKA_GROUP_ID || 'search-group',
  },
};
