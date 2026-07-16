import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { isProd } from '../lib/env.js';

/** Erreur métier portant un statut HTTP. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = 'error',
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: `${req.method} ${req.path}` } });
};

/**
 * Handler d'erreurs centralisé.
 *
 * Express 5 propage les rejets des handlers async jusqu'ici automatiquement —
 * c'est ce qui rend le `catch(next)` de la v4 inutile. Le middleware doit
 * garder ses quatre paramètres : Express les compte pour l'identifier.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: 'Requête invalide.',
        issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }

  req.log?.error({ err }, 'unhandled error');

  // En production, aucun détail interne ne franchit la frontière HTTP.
  res.status(500).json({
    error: {
      code: 'internal_error',
      message: isProd ? 'Erreur interne.' : String((err as Error)?.message ?? err),
    },
  });
};
