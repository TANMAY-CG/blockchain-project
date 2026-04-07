import { createApp } from './app';
import { env } from './config/env';
import { connectMongo } from './db/mongo';

async function main() {
  await connectMongo(env.MONGODB_URI);
  const app = createApp();

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Snovia backend listening on :${env.PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

