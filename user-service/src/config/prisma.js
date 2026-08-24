const { PrismaClient } = require('@prisma/client');

const globalForPrisma = global;

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
}

module.exports = globalForPrisma.prisma;
