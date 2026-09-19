import { Router } from 'express';
import { shopifyConfigured, fetchShopifyOrders } from '../lib/shopify.js';
import { HttpError } from '../middleware/error.js';

export const shopifyRouter: Router = Router();

/**
 * État de la connexion Shopify — permet de vérifier d'un coup d'œil si le
 * niveau opérationnel (commandes) est actif ou en attente de token.
 */
shopifyRouter.get('/shopify/status', (_req, res) => {
  res.json({
    catalog: 'public', // toujours aspirable via /products.json
    orders: shopifyConfigured() ? 'connected' : 'awaiting_token',
  });
});

/**
 * Aperçu des commandes Shopify.
 *
 * @todo Phase 1 — remplacer cet aperçu par une vraie synchro qui persiste
 * dans `orders` et alimente la file du dashboard. Route à protéger (admin).
 */
shopifyRouter.get('/shopify/orders', async (_req, res) => {
  if (!shopifyConfigured()) {
    throw new HttpError(
      503,
      'Commandes indisponibles : token Admin API Shopify non configuré.',
      'shopify_not_configured',
    );
  }
  const orders = await fetchShopifyOrders(50);
  res.json({
    count: orders.length,
    orders: orders.map((o) => ({
      reference: o.name,
      createdAt: o.created_at,
      total: o.total_price,
      currency: o.currency,
      fulfillment: o.fulfillment_status,
      city: o.shipping_address?.city ?? null,
    })),
  });
});
