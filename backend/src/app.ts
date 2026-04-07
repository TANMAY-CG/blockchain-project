import express, { NextFunction, Request, Response } from 'express';
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
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });

  app.get('/', (req: Request, res: Response) =>
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
        sealedPortalFile: 'open frontend/index.html',
        sealedProblems: 'http://localhost:4600',
      },
    })
  );

  app.get('/portal', (req: Request, res: Response) => {
    const file = path.resolve(process.cwd(), '..', 'frontend', 'index.html');
    return res.sendFile(file);
  });

  app.get('/health', (req: Request, res: Response) => res.json({ ok: true }));
  app.use('/api/events', eventsRouter);
  app.use('/api/portal', portalRouter);

  return app;
}

