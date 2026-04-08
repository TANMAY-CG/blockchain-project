import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4601),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/sealed_db'),
  SEALED_WEBHOOK_SECRET: z.string().min(1).default('change_me'),
  SEALED_PROBLEMS_URL: z.string().url().default('http://localhost:4600/api/problems'),
  HARDHAT_RPC_URL: z.string().url().default('http://127.0.0.1:8545'),
  HARDHAT_PRIVATE_KEY: z.string().optional(),
  HARDHAT_CONTRACT_ADDRESS: z.string().optional(),
  SEALED_CHAIN_MODE: z.enum(['mock', 'hardhat']).default('mock'),
  RESEND_API_KEY: z.string().optional(),
  SEALED_PORTAL_BASE_URL: z.string().url().default('http://localhost:5174'),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid env:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

if (parsed.data.NODE_ENV === 'production' && parsed.data.SEALED_WEBHOOK_SECRET === 'change_me') {
  // eslint-disable-next-line no-console
  console.error('Invalid env: SEALED_WEBHOOK_SECRET must be changed in production');
  process.exit(1);
}

if (parsed.data.NODE_ENV === 'production' && !parsed.data.CORS_ALLOWED_ORIGINS?.trim()) {
  // eslint-disable-next-line no-console
  console.error('Invalid env: CORS_ALLOWED_ORIGINS is required in production');
  process.exit(1);
}

export const env = parsed.data;

