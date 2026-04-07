import express from 'express';
import cors from 'cors';
import path from 'path';
import { eventsRouter } from './routes/events';
import { portalRouter } from './routes/portal';
import { env } from './config/env';

export function createApp() {
  const app = express();
  const allowedOrigins = (env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  app.set('trust proxy', 1);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (!allowedOrigins.length || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('CORS origin not allowed'));
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-snovia-signature'],
      credentials: false,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use((_, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });

  app.get('/', (_req, res) =>
    res.json({
      service: 'Sealed Backend API',
      ok: true,
      endpoints: {
        health: '/health',
        ingest: '/api/events/warranty',
        portalOtpRequest: '/api/portal/otp/request',
        portalOtpVerify: '/api/portal/otp/verify',
      },
      ui: {
        sealedPortalFile: 'open frontend/sealed-portal.html',
        sealedProblems: 'http://localhost:4600',
      },
    })
  );

  app.get('/portal', (_req, res) => {
    const file = path.resolve(process.cwd(), '..', 'frontend', 'sealed-portal.html');
    return res.sendFile(file);
  });

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/events', eventsRouter);
  app.use('/api/portal', portalRouter);

  return app;
}

