const { Client } = require('pg');

async function createTables() {
  const client = new Client({ connectionString: 'postgresql://admin:irctcpass@localhost:5432/postgres' });
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database...');

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'SEATS_HELD', 'PAYMENT_PENDING', 'CONFIRMING', 'CONFIRMED', 'FAILED', 'EXPIRED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        pnr TEXT UNIQUE NOT NULL,
        "userId" INT NOT NULL,
        "scheduleId" INT NOT NULL,
        "fromStationId" INT NOT NULL,
        "toStationId" INT NOT NULL,
        "totalAmount" DOUBLE PRECISION NOT NULL,
        status "BookingStatus" NOT NULL DEFAULT 'PENDING',
        "idempotencyKey" TEXT UNIQUE NOT NULL,
        "razorpayOrderId" TEXT UNIQUE,
        "paymentId" TEXT,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS booking_passengers (
        id TEXT PRIMARY KEY,
        "bookingId" TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        age INT NOT NULL,
        gender TEXT NOT NULL,
        "seatId" INT NOT NULL,
        "seatNumber" TEXT NOT NULL,
        "berthType" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS seat_inventories (
        id TEXT PRIMARY KEY,
        "scheduleId" TEXT NOT NULL,
        "seatId" TEXT NOT NULL,
        "fromSequenceNum" INT NOT NULL,
        "toSequenceNum" INT NOT NULL,
        status TEXT NOT NULL DEFAULT 'AVAILABLE',
        "bookingId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ PostgreSQL Schema & Tables successfully created!');
  } catch (err) {
    console.error('❌ Table Creation Error:', err.message);
  } finally {
    await client.end();
  }
}

createTables();
