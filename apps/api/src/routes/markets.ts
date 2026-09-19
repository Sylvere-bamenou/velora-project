import { Router } from 'express';
import { query, queryOne } from '../lib/db.js';
import { HttpError } from '../middleware/error.js';

export const marketsRouter: Router = Router();

/**
 * Configuration par marché, lue depuis market_config (Postgres).
 *
 * NB — les Pixel ID / Access Token Meta, TikTok et Snapchat ne sont PAS ici :
 * ils sont globaux, partagés par tous les marchés, dans l'environnement.
 */
export interface MarketConfig {
  code: string;
  name: string;
  currency: string;
  phone_prefix: string;
  whatsapp: string | null;
  delivery_estimate: string;
  free_shipping_threshold: number | null;
  enabled: boolean;
}

const COLUMNS =
  'code, name, currency, phone_prefix, whatsapp, delivery_estimate, free_shipping_threshold, enabled';

marketsRouter.get('/markets', async (_req, res) => {
  const markets = await query<MarketConfig>(
    `select ${COLUMNS} from market_config where enabled = true order by code`,
  );
  res.json({ markets });
});

marketsRouter.get('/markets/:code', async (req, res) => {
  const market = await queryOne<MarketConfig>(
    `select ${COLUMNS} from market_config where code = $1`,
    [req.params.code],
  );
  if (!market) throw new HttpError(404, `Marché inconnu : ${req.params.code}`, 'unknown_market');
  res.json({ market });
});

/** Utilitaire partagé : récupère une config marché active, ou undefined. */
export async function getEnabledMarket(code: string): Promise<MarketConfig | undefined> {
  return queryOne<MarketConfig>(
    `select ${COLUMNS} from market_config where code = $1 and enabled = true`,
    [code],
  );
}
