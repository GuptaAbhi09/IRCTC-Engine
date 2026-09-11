const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

prisma.$connect()
  .then(() => logger.info('[ADMIN-SERVICE] Connected to PostgreSQL database via Prisma'))
  .catch((err) => logger.error(`[ADMIN-SERVICE] Database connection error: ${err.message}`));

module.exports = prisma;
