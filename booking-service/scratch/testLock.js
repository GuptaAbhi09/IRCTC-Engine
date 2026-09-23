const { generateLockKeys, acquireSeatLocks, releaseSeatLocks } = require('../src/utils/redisLock');

async function testLocking() {
  console.log('🧪 Testing Redis Atomic Lua Segment Locking...');

  const scheduleId = 101;
  const seatIds = [5, 6];
  const fromSeq = 1;
  const toSeq = 3;
  const owner1 = 'user-uuid-1111';
  const owner2 = 'user-uuid-2222';

  const lockKeys = generateLockKeys(scheduleId, seatIds, fromSeq, toSeq);
  console.log('Generated Lock Keys:', lockKeys);

  // 1. User 1 acquires lock
  const success1 = await acquireSeatLocks(lockKeys, owner1, 60000);
  console.log(`User 1 Lock Result: ${success1 ? '✅ ACQUIRED' : '❌ DENIED'}`);

  // 2. User 2 attempts to lock the exact same segments concurrently
  const success2 = await acquireSeatLocks(lockKeys, owner2, 60000);
  console.log(`User 2 Concurrent Lock Result: ${success2 ? '❌ UNEXPECTED SUCCESS' : '✅ DENIED (PROPERLY BLOCKED)'}`);

  // 3. User 1 releases lock
  const releasedCount = await releaseSeatLocks(lockKeys, owner1);
  console.log(`User 1 Lock Release Count: ${releasedCount} keys released`);

  // 4. User 2 attempts again after release
  const success3 = await acquireSeatLocks(lockKeys, owner2, 60000);
  console.log(`User 2 Retry Lock Result: ${success3 ? '✅ ACQUIRED' : '❌ DENIED'}`);

  // Clean up
  await releaseSeatLocks(lockKeys, owner2);
  console.log('🎉 Lock Test Complete!');
  process.exit(0);
}

testLocking().catch(console.error);
