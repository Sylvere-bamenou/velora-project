import { Router } from 'express';
import { pingDb } from '../lib/db.js';

export const healthRouter: Router = Router();

/** Sonde de vivacité — utilisée par Railway et le CI. */
healthRouter.get('/health', async (_req, res) => {
  const db = await pingDb();
  res.status(db ? 200 : 503).json({
    status: db ? 'ok' : 'degraded',
    service: 'velora-api',
    db: db ? 'up' : 'down',
    uptime: Math.round(process.uptime()),
  });
});
