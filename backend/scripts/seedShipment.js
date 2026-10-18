import { connectDB, disconnectDB } from '../src/config/db.js';
import { Shipment } from '../src/models/Shipment.js';

const deviceId = process.argv[2] || 'CC-001';

const run = async () => {
  await connectDB();
  const now = new Date();

  await Shipment.findOneAndUpdate(
    { shipmentId: 'CC1024' },
    {
      $set: {
        trackingCode: 'TRK-CC1024',
        productName: 'Vaccines',
        productCategory: 'Vaccine',
        minTempC: 2,
        maxTempC: 8,
        origin: { name: 'Mumbai, MH', latitude: 19.076, longitude: 72.8777 },
        destination: { name: 'Pune, MH', latitude: 18.5204, longitude: 73.8567 },
        startTime: now,
        expectedArrival: new Date(now.getTime() + 27 * 3600 * 1000),
        deviceId,
        status: 'in_transit',
        isSimulated: true
      },
      $setOnInsert: {
        history: [{ status: 'in_transit', location: 'Mumbai, MH', note: 'Seeded test shipment', at: now }]
      }
    },
    { upsert: true, new: true }
  );

  console.log(`Shipment CC1024 is in_transit and assigned to device ${deviceId}`);
  await disconnectDB();
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});