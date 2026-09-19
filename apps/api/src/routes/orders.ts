import { Router } from 'express';
import { z } from 'zod';
import { assess, type RiskSignal } from '@velora/fraud';
import { newEventId, normalizePhoneE164 } from '@velora/tracking';
import { pool } from '../lib/db.js';
import { orderLimiter } from '../middleware/rate-limit.js';
import { HttpError } from '../middleware/error.js';
import { getEnabledMarket } from './markets.js';
import { env } from '../lib/env.js';

export const ordersRouter: Router = Router();

/**
 * Soumission d'une commande COD.
 *
 * Aucun paiement n'est encaissé : on enregistre une intention de commande,
 * qu'un agent confirmera par téléphone avant expédition. Tout est persisté
 * en une transaction : commande, lignes, évaluation de risque, événement de
 * tracking. Si une étape échoue, rien n'est écrit.
 */
const orderSchema = z.object({
  market: z.enum(['bj', 'ci', 'ga']),
  customer: z.object({
    name: z.string().trim().min(2, 'Nom trop court.'),
    phone: z.string().trim().min(8, 'Numéro à 8 chiffres minimum.'),
    city: z.string().trim().min(2, 'Ville requise.'),
    address: z.string().trim().min(3, 'Indiquez un repère de livraison.'),
  }),
  // On identifie les variantes par SKU : c'est la clé stable du catalogue,
  // et le prix est relu en base, jamais fait confiance au client.
  items: z
    .array(z.object({ sku: z.string().min(1), quantity: z.number().int().positive().max(20) }))
    .min(1, 'Panier vide.'),
  attribution: z
    .object({
      fbp: z.string().optional(),
      fbc: z.string().optional(),
      ttp: z.string().optional(),
      ttclid: z.string().optional(),
    })
    .optional(),
});

interface VariantLookup {
  id: string;
  sku: string;
  price: number;
  stock: number;
  product_name: string;
}

ordersRouter.post('/orders', orderLimiter, async (req, res) => {
  const body = orderSchema.parse(req.body);

  const market = await getEnabledMarket(body.market);
  if (!market) throw new HttpError(400, `Marché indisponible : ${body.market}`, 'market_disabled');

  // Prix relus en base par SKU. Un SKU inconnu casse la commande plutôt que
  // de laisser passer un article fantôme.
  const skus = body.items.map((i) => i.sku);
  const variants = (
    await pool.query<VariantLookup>(
      `select v.id, v.sku, v.price::int, v.stock, p.name as product_name
       from variants v join products p on p.id = v.product_id
       where v.sku = any($1)`,
      [skus],
    )
  ).rows;
  const bySku = new Map(variants.map((v) => [v.sku, v]));

  const missing = skus.filter((s) => !bySku.has(s));
  if (missing.length) {
    throw new HttpError(400, `SKU inconnu(s) : ${missing.join(', ')}`, 'unknown_sku');
  }

  const lines = body.items.map((i) => {
    const v = bySku.get(i.sku)!;
    return { variant: v, quantity: i.quantity, lineTotal: v.price * i.quantity };
  });
  const total = lines.reduce((sum, l) => sum + l.lineTotal, 0);

  // ─── Anti-fraude · Phase 2 alimentera ce tableau (IPQualityScore, HLR…) ───
  const signals: RiskSignal[] = [];
  const risk = assess(signals, { enforcement: env.FRAUD_ENFORCEMENT });

  const phoneE164 = normalizePhoneE164(body.customer.phone, market.phone_prefix);
  const reference = `VLR-${body.market.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

  // L'event_id est alloué une fois côté serveur : renvoyé au navigateur pour
  // le pixel ET persisté pour l'envoi CAPI, c'est ce partage qui déduplique.
  const eventId = newEventId(body.market, 'Lead');

  const snapshot = lines.map((l) => ({
    sku: l.variant.sku,
    name: l.variant.product_name,
    quantity: l.quantity,
    unitPrice: l.variant.price,
  }));

  const client = await pool.connect();
  try {
    await client.query('begin');

    const { rows } = await client.query<{ id: string }>(
      `insert into orders
        (reference, market, status, customer_name, customer_phone, customer_city,
         customer_address, total, currency, cart_snapshot, fbp, fbc, ttp, ttclid,
         ip, user_agent, risk_score)
       values ($1,$2,'pending',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       returning id`,
      [
        reference,
        body.market,
        body.customer.name,
        phoneE164,
        body.customer.city,
        body.customer.address,
        total,
        market.currency,
        JSON.stringify(snapshot),
        body.attribution?.fbp ?? null,
        body.attribution?.fbc ?? null,
        body.attribution?.ttp ?? null,
        body.attribution?.ttclid ?? null,
        req.ip ?? null,
        req.get('user-agent') ?? null,
        risk.score,
      ],
    );
    const orderId = rows[0]!.id;

    for (const l of lines) {
      await client.query(
        `insert into order_items (order_id, variant_id, quantity, unit_price)
         values ($1,$2,$3,$4)`,
        [orderId, l.variant.id, l.quantity, l.variant.price],
      );
    }

    await client.query(
      `insert into fraud_assessments (order_id, score, signals, decision, applied, enforcement)
       values ($1,$2,$3,$4,$5,$6)`,
      [orderId, risk.score, JSON.stringify(risk.signals), risk.decision, risk.applied, risk.enforcement],
    );

    // Une ligne par plateforme : même event_id, statut d'envoi indépendant.
    // @todo Phase 3 — une queue passera ces lignes de 'pending' à 'sent'.
    for (const platform of ['meta', 'tiktok'] as const) {
      await client.query(
        `insert into tracking_events (event_id, order_id, market, event_name, platform, payload)
         values ($1,$2,$3,'Lead',$4,$5)`,
        [eventId, orderId, body.market, platform, JSON.stringify({ value: total, currency: market.currency })],
      );
    }

    await client.query('commit');

    req.log?.info(
      { reference, market: body.market, total, score: risk.score, applied: risk.applied },
      'order persisted',
    );

    res.status(201).json({
      order: {
        reference,
        market: body.market,
        currency: market.currency,
        total,
        deliveryEstimate: market.delivery_estimate,
        phoneE164,
      },
      tracking: { eventId, event: 'Lead' },
    });
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
});
