const express = require('express');
const idempotencyMiddleware = require('../src/middlewares/idempotency.middleware');
const redis = require('../src/config/redis');

const app = express();
app.use(express.json());

let callCount = 0;

app.post('/test-booking', idempotencyMiddleware, (req, res) => {
  callCount++;
  res.status(201).json({
    success: true,
    message: 'Booking created',
    callCount,
    pnr: '8401928401'
  });
});

async function runTest() {
  console.log('🧪 Testing Idempotency Engine Middleware...');
  const key = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

  // Clean redis key first
  await redis.del(`idempotency:${key}`);

  const server = app.listen(3099, async () => {
    try {
      // 1. First Request
      const res1 = await fetch('http://localhost:3099/test-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key
        },
        body: JSON.stringify({ item: 'Ticket' })
      });
      const data1 = await res1.json();
      console.log('Request 1 Response (Status 201 expected):', data1);

      // 2. Duplicate Request with EXACT SAME key
      const res2 = await fetch('http://localhost:3099/test-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key
        },
        body: JSON.stringify({ item: 'Ticket' })
      });
      const data2 = await res2.json();
      console.log('Request 2 Response (Cached Status 201 expected):', data2);

      console.log(`Business logic execution count (Expected 1): ${data2.callCount}`);

      if (data1.callCount === 1 && data2.callCount === 1) {
        console.log('🎉 Idempotency Engine Verified Successfully!');
      } else {
        console.error('❌ Idempotency Test Failed');
      }
    } catch (err) {
      console.error('Test Error:', err);
    } finally {
      await redis.del(`idempotency:${key}`);
      server.close();
      process.exit(0);
    }
  });
}

runTest().catch(console.error);
