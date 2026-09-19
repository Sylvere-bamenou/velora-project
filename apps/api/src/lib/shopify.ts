import { env } from './env.js';

/**
 * Connecteur Shopify — transition depuis la boutique existante.
 *
 * Deux niveaux, radicalement différents :
 *
 *   Catalogue   endpoint public /products.json, aucun identifiant.
 *               Aspiré hors-ligne par scripts/import-shopify-catalog.mjs.
 *
 *   Commandes   Admin API, token requis. C'est le cœur opérationnel du COD
 *               (file de commandes, confirmation téléphonique, livraison).
 *               Ce module reste inerte tant que le token n'est pas fourni.
 *
 * Créer le token (à faire côté Shopify, pas ici) :
 *   1. admin Shopify → Paramètres → Applications et canaux de vente
 *      → Développer des applications → Créer une application
 *   2. Configurer les scopes Admin API : read_orders, read_customers,
 *      read_products, read_fulfillments
 *   3. Installer l'app → copier le token « shpat_… »
 *   4. Le déposer dans .env : SHOPIFY_ADMIN_TOKEN et SHOPIFY_STORE_DOMAIN
 *
 * Le token ne doit jamais être commité ni collé dans une conversation :
 * il donne accès aux données clients de la boutique.
 */

export function shopifyConfigured(): boolean {
  return Boolean(env.SHOPIFY_STORE_DOMAIN && env.SHOPIFY_ADMIN_TOKEN);
}

/** Erreur explicite quand on tente une opération Admin sans token. */
export class ShopifyNotConfiguredError extends Error {
  constructor() {
    super(
      'Shopify Admin non configuré : renseignez SHOPIFY_STORE_DOMAIN et ' +
        'SHOPIFY_ADMIN_TOKEN dans .env (voir apps/api/src/lib/shopify.ts).',
    );
    this.name = 'ShopifyNotConfiguredError';
  }
}

interface ShopifyOrder {
  id: number;
  name: string;
  created_at: string;
  financial_status: string | null;
  fulfillment_status: string | null;
  total_price: string;
  currency: string;
  customer: { first_name: string | null; last_name: string | null } | null;
  shipping_address: { city: string | null; phone: string | null; address1: string | null } | null;
}

/**
 * Récupère les dernières commandes depuis l'Admin API.
 *
 * @todo Phase 1 — persister dans `orders` (Supabase), dédupliquer par
 * reference Shopify, et exposer via la file de commandes du dashboard.
 */
export async function fetchShopifyOrders(limit = 50): Promise<ShopifyOrder[]> {
  if (!shopifyConfigured()) throw new ShopifyNotConfiguredError();

  const url =
    `https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/${env.SHOPIFY_API_VERSION}` +
    `/orders.json?status=any&limit=${limit}`;

  const res = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_TOKEN as string,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Shopify Admin a répondu ${res.status} : ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { orders: ShopifyOrder[] };
  return data.orders;
}
