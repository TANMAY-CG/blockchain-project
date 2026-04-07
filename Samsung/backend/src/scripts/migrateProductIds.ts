import { connectMongo } from '../db/mongo';
import { env } from '../config/env';
import { Product } from '../models/Product';

const map: Record<string, string> = {
  'SS-P-1001': 'P001',
  'SS-P-1002': 'P002',
  'SS-P-1003': 'P003',
  'SS-P-1004': 'P004',
  'SS-P-1005': 'P005',
  'SS-P-1006': 'P006',
  'SS-P-1007': 'P007',
  'SS-P-1008': 'P008',
  'SS-P-1009': 'P009',
  'SS-P-1010': 'P010',
  'SS-P-1011': 'P011',
  'SS-P-1012': 'P012',
};

async function main() {
  await connectMongo(env.MONGODB_URI);

  let changed = 0;
  for (const [oldId, newId] of Object.entries(map)) {
    const doc = await Product.findOne({ productId: oldId });
    if (!doc) continue;

    const exists = await Product.findOne({ productId: newId });
    if (exists) {
      // If newId already exists, delete old doc to avoid duplicates
      await Product.deleteOne({ _id: doc._id });
      changed += 1;
      continue;
    }

    doc.productId = newId;
    await doc.save();
    changed += 1;
  }

  // eslint-disable-next-line no-console
  console.log(`Migration complete. Updated/deleted ${changed} products.`);
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

