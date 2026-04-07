import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4001),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/snovia_warranty'),
  SEAL_API_URL: z.string().min(1).default('http://localhost:4601/api/events/warranty'),
  SEALED_WEBHOOK_SECRET: z.string().min(1).default('change_me'),
});

const parsed = EnvSchema.safeParse({
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI,
  SEAL_API_URL: process.env.SEAL_API_URL,
  SEALED_WEBHOOK_SECRET: process.env.SEALED_WEBHOOK_SECRET,
});

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

if (!process.env.MONGODB_URI) {
  // eslint-disable-next-line no-console
  console.warn('[Snovia backend] MONGODB_URI not set; using default localhost MongoDB.');
}

