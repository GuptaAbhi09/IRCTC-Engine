const { consumer } = require('../config/kafka');
const prisma = require('../config/db');

/**
 * Consumer for admin.schedule.created event.
 * Pre-generates segment seat inventory records when a train schedule is created.
 */
const startScheduleConsumer = async () => {
  await consumer.subscribe({ topic: 'admin.schedule.created', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const payload = JSON.parse(message.value.toString());
        console.log(`📥 Received event on [${topic}]: Schedule ID ${payload.scheduleId}`);

        const { scheduleId, trainId, totalSeats, routeStations } = payload;

        if (!scheduleId || !totalSeats || !routeStations || routeStations.length < 2) {
          console.warn('⚠️ Invalid schedule creation payload received:', payload);
          return;
        }

        // Sort route stations by sequence number
        const sortedStations = [...routeStations].sort((a, b) => a.sequenceNum - b.sequenceNum);

        // Fetch seat IDs for this train
        const seats = await prisma.seat.findMany({
          where: { trainId: parseInt(trainId) },
          select: { id: true, seatNumber: true }
        });

        if (seats.length === 0) {
          console.warn(`⚠️ No physical seats found for trainId ${trainId}`);
          return;
        }

        const inventoryRecords = [];

        // Generate contiguous segment pairs: (seq 1 -> seq 2), (seq 2 -> seq 3), etc.
        for (let i = 0; i < sortedStations.length - 1; i++) {
          const fromStation = sortedStations[i];
          const toStation = sortedStations[i + 1];

          for (const seat of seats) {
            inventoryRecords.push({
              scheduleId: parseInt(scheduleId),
              seatId: seat.id,
              fromSequenceNum: fromStation.sequenceNum,
              toSequenceNum: toStation.sequenceNum,
              status: 'AVAILABLE'
            });
          }
        }

        // Bulk insert generated seat segments
        if (inventoryRecords.length > 0) {
          const result = await prisma.seatInventory.createMany({
            data: inventoryRecords,
            skipDuplicates: true
          });

          console.log(`✅ Pre-generated ${result.count} seat segment records for scheduleId ${scheduleId}`);
        }
      } catch (error) {
        console.error('❌ Error processing schedule event:', error);
      }
    }
  });
};

module.exports = { startScheduleConsumer };
