import { connectMongo } from '../db/mongo';
import { env } from '../config/env';
import { Product } from '../models/Product';

const seedProducts = [
  {
    productId: 'P001',
    model: 'Snovia SmartBook A4',
    serialNumber: 'SN-A4-001',
    imei: 'IMEI-A4-001',
  },
  {
    productId: 'P002',
    model: 'Snovia Galaxy S24 Ultra',
    serialNumber: 'SN-S24U-002',
    imei: 'IMEI-S24U-002',
  },
  {
    productId: 'P003',
    model: 'Snovia Galaxy S23',
    serialNumber: 'SN-S23-003',
    imei: 'IMEI-S23-003',
  },
];

async function main() {
  await connectMongo(env.MONGODB_URI);

  // Clear existing products completely (no old SS-P-XXXX should remain).
  await Product.deleteMany({});
  const inserted = await Product.insertMany(seedProducts, { ordered: true });

  // eslint-disable-next-line no-console
  console.log('Seed complete:', { insertedCount: inserted.length });
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

