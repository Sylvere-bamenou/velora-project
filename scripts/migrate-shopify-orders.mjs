#!/usr/bin/env node
/**
 * Migration ONE-SHOT de l'historique des commandes Shopify vers Velora.
 *
 * À exécuter une seule fois, au moment de couper Shopify. Ce n'est pas un
 * connecteur : rien dans l'API runtime ne dépend de Shopify. Après cette
 * migration, Velora est le système de commandes.
 *
 * Prérequis : un token Admin API (usage unique).
 *   1. admin Shopify → Paramètres → Applications et canaux de vente
 *      → Développer des applications → Créer une application
 *   2. Scopes Admin API : read_orders, read_customers
 *   3. Installer → copier le token « shpat_… »
 *
 * Exécution (le token ne doit jamais être commité) :
 *   SHOPIFY_STORE_DOMAIN=jngiej-ax.myshopify.com \
 *   SHOPIFY_ADMIN_TOKEN=shpat_xxx \
 *   node scripts/migrate-shopify-orders.mjs
 *
 * Sortie : supabase/seed-orders.sql (à relire avant application) et
 * un dump brut horodaté pour vérification. Idempotent : upsert par référence.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';
/** Marché de rattachement des commandes historiques (seul marché ouvert). */
const MARKET = process.env.MIGRATION_MARKET || 'bj';

if (!DOMAIN || !TOKEN) {
  console.error('✗ SHOPIFY_STORE_DOMAIN et SHOPIFY_ADMIN_TOKEN requis.');
  console.error('  Voir l\'en-tête de ce fichier pour créer le token (usage unique).');
  process.exit(1);
}

function sqlStr(v) {
  if (v === null || v === undefined) return 'null';
  return `'${String(v).replace(/'/g, "''")}'`;
}

function toAmount(str) {
  const n = Math.round(parseFloat(str ?? '0'));
  return Number.isFinite(n) ? n : 0;
}

/** Statut Shopify → order_status de Velora (voir supabase/schema.sql). */
function mapStatus(o) {
  if (o.cancelled_at) return 'cancelled';
  if (o.fulfillment_status === 'fulfilled') return 'delivered';
  if (o.fulfillment_status === 'partial') return 'shipped';
  return 'pending';
}

/** Extrait le page_info du header Link pour la pagination Shopify. */
function nextPageInfo(linkHeader) {
  if (!linkHeader) return null;
  const m = linkHeader.match(/<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/);
  return m ? m[1] : null;
}

async function fetchAllOrders() {
  const orders = [];
  let pageInfo = null;
  let page = 0;
  do {
    const params = new URLSearchParams({ status: 'any', limit: '250' });
    if (pageInfo) params.set('page_info', pageInfo);
    const url = `https://${DOMAIN}/admin/api/${VERSION}/orders.json?${params}`;
    const res = await fetch(url, {
      headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Shopify Admin ${res.status} : ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    orders.push(...data.orders);
    pageInfo = nextPageInfo(res.headers.get('link'));
    console.log(`  page ${++page} : ${data.orders.length} commandes (total ${orders.length})`);
  } while (pageInfo);
  return orders;
}

async function main() {
  console.log(`→ Migration commandes : ${DOMAIN}`);
  const orders = await fetchAllOrders();
  console.log(`  ${orders.length} commandes récupérées`);

  const lines = [
    '-- ============================================================',
    '-- Velora · historique des commandes migré de Shopify (ONE-SHOT)',
    `-- Source : ${DOMAIN} · ${new Date().toISOString()}`,
    '-- Généré par scripts/migrate-shopify-orders.mjs.',
    '-- À RELIRE avant application. Idempotent : upsert par reference.',
    '-- Après cette migration, Shopify peut être coupé.',
    '-- ============================================================',
    '',
  ];

  for (const o of orders) {
    const addr = o.shipping_address || o.billing_address || {};
    const customer = o.customer || {};
    const name =
      [customer.first_name, customer.last_name].filter(Boolean).join(' ') ||
      addr.name ||
      'Client Shopify';
    const phone = addr.phone || o.phone || customer.phone || '';
    const snapshot = JSON.stringify(
      (o.line_items || []).map((li) => ({
        title: li.title,
        variant: li.variant_title,
        sku: li.sku,
        quantity: li.quantity,
        price: toAmount(li.price),
      })),
    );

    lines.push(
      `insert into orders (reference, market, status, customer_name, customer_phone, ` +
        `customer_city, customer_address, total, currency, cart_snapshot, created_at) values (` +
        `${sqlStr(o.name)}, ${sqlStr(MARKET)}, ${sqlStr(mapStatus(o))}, ${sqlStr(name)}, ` +
        `${sqlStr(phone)}, ${sqlStr(addr.city || '')}, ${sqlStr(addr.address1 || '')}, ` +
        `${toAmount(o.total_price)}, ${sqlStr(o.currency)}, ${sqlStr(snapshot)}::jsonb, ` +
        `${sqlStr(o.created_at)}) on conflict (reference) do update set ` +
        `status = excluded.status, total = excluded.total;`,
    );
  }

  const sqlPath = resolve(ROOT, 'supabase/seed-orders.sql');
  writeFileSync(sqlPath, lines.join('\n') + '\n');
  console.log(`✓ ${sqlPath}`);

  const dumpPath = resolve(ROOT, `supabase/shopify-orders-dump.json`);
  writeFileSync(dumpPath, JSON.stringify(orders, null, 2));
  console.log(`✓ ${dumpPath} (dump brut pour vérification)`);

  const byStatus = {};
  for (const o of orders) byStatus[mapStatus(o)] = (byStatus[mapStatus(o)] ?? 0) + 1;
  console.log(`\n${orders.length} commandes migrées :`, byStatus);
  console.log('Relisez seed-orders.sql, appliquez-le, puis Shopify peut être coupé.');
}

main().catch((err) => {
  console.error('✗ Migration échouée :', err.message);
  process.exit(1);
});
