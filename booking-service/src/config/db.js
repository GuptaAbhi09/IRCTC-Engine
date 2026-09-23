const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient({
  log: ['error', 'warn']
});

prisma.$connect()
  .then(() => logger.info('✅ Booking Service connected to PostgreSQL Database'))
  .catch((err) => logger.error('❌ Database Connection Error:', err));

module.exports = prisma;
