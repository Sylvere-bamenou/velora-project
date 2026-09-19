import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { corsOrigins, isProd } from './lib/env.js';
import { generalLimiter } from './middleware/rate-limit.js';
import { errorHandler, notFound } from './middleware/error.js';
import { healthRouter } from './routes/health.js';
import { marketsRouter } from './routes/markets.js';
import { productsRouter } from './routes/products.js';
import { ordersRouter } from './routes/orders.js';
import { trackingRouter } from './routes/tracking.js';

export function createApp(): Express {
  const app = express();

  /**
   * Railway et Vercel placent l'API derrière un proxy. Sans ce réglage,
   * `req.ip` vaudrait l'IP du proxy pour tout le monde — le rate limiting
   * compterait tous les clients dans un seul seau et l'IP journalisée pour
   * l'anti-fraude serait systématiquement fausse.
   *
   * `1` = un seul proxy de confiance. Ne pas mettre `true` : ça ferait
   * confiance à un X-Forwarded-For arbitraire, donc usurpable.
   */
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(pinoHttp({ level: isProd ? 'info' : 'debug' }));
  app.use(helmet());
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(generalLimiter);

  app.use('/', healthRouter);
  app.use('/v1', marketsRouter);
  app.use('/v1', productsRouter);
  app.use('/v1', ordersRouter);
  app.use('/v1', trackingRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
