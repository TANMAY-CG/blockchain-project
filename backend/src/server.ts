import { createApp } from './app';
import { env } from './config/env';
import { connectMongo } from './db/mongo';
import { logProblem } from './services/problemsLogger';

async function main() {
  await connectMongo(env.MONGODB_URI);
  const app = createApp();
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Sealed backend listening on :${env.PORT}`);
  });
}

main().catch(async (err) => {
  await logProblem({
    where: 'server:bootstrap',
    how: 'Backend failed during startup',
    severity: 'Critical',
    error: err instanceof Error ? err.stack || err.message : String(err),
  });
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

