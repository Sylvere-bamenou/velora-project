import { Router } from 'express';

export const healthRouter: Router = Router();

/** Sonde de vivacité — utilisée par Railway et le CI. */
healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'velora-api',
    uptime: Math.round(process.uptime()),
  });
});
