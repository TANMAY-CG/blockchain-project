import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { productsRouter } from './routes/products';
import { warrantiesRouter } from './routes/warranties';
import { uploadsRouter } from './routes/uploads';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  const uploadDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  app.use('/uploads', express.static(uploadDir));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/products', productsRouter);
  app.use('/api/warranties', warrantiesRouter);
  app.use('/api/uploads', uploadsRouter);

  return app;
}

