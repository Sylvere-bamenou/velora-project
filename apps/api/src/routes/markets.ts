import { Router } from 'express';
import { HttpError } from '../middleware/error.js';

export const marketsRouter: Router = Router();

/**
 * Configuration par marché.
 *
 * En Phase 0 les configs sont en dur ; elles passeront en table `market_config`
 * (Supabase) pour être éditables depuis le dashboard sans redéploiement — c'est
 * le principe fondateur du multi-marchés (§3 du plan).
 *
 * NB — les Pixel ID / Access Token Meta, TikTok et Snapchat ne figurent PAS
 * ici : ils sont globaux, partagés par tous les marchés, et vivent dans la
 * configuration d'environnement (voir src/lib/env.ts).
 */
export interface MarketConfig {
  code: 'bj' | 'ci' | 'ga';
  name: string;
  currency: 'XOF' | 'XAF';
  phonePrefix: string;
  whatsapp: string;
  deliveryEstimate: string;
  freeShippingThreshold: number | null;
  enabled: boolean;
}

const MARKETS: Record<string, MarketConfig> = {
  bj: {
    code: 'bj',
    name: 'Bénin',
    currency: 'XOF',
    phonePrefix: '229',
    whatsapp: '+229 01 00 00 00 00',
    deliveryEstimate: '24–48 h',
    freeShippingThreshold: 50_000,
    enabled: true,
  },
  ci: {
    code: 'ci',
    name: "Côte d'Ivoire",
    currency: 'XOF',
    phonePrefix: '225',
    whatsapp: '+225 00 00 00 00 00',
    deliveryEstimate: '48–72 h',
    freeShippingThreshold: 50_000,
    enabled: false,
  },
  ga: {
    code: 'ga',
    name: 'Gabon',
    currency: 'XAF',
    phonePrefix: '241',
    whatsapp: '+241 00 00 00 00',
    deliveryEstimate: '3–5 j',
    freeShippingThreshold: null,
    enabled: false,
  },
};

marketsRouter.get('/markets', (_req, res) => {
  res.json({ markets: Object.values(MARKETS).filter((m) => m.enabled) });
});

marketsRouter.get('/markets/:code', (req, res) => {
  const market = MARKETS[req.params.code];
  if (!market) throw new HttpError(404, `Marché inconnu : ${req.params.code}`, 'unknown_market');
  res.json({ market });
});

export function getMarket(code: string): MarketConfig | undefined {
  return MARKETS[code];
}
