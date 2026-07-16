import { Router } from 'express';
import { z } from 'zod';
import { assess, type RiskSignal } from '@velora/fraud';
import { prepareEvent, normalizePhoneE164 } from '@velora/tracking';
import { orderLimiter } from '../middleware/rate-limit.js';
import { HttpError } from '../middleware/error.js';
import { getMarket } from './markets.js';
import { env } from '../lib/env.js';

export const ordersRouter: Router = Router();

/**
 * Soumission d'une commande COD.
 *
 * Aucun paiement n'est encaissé : on enregistre une intention de commande,
 * qu'un agent confirmera par téléphone avant expédition.
 */
const orderSchema = z.object({
  market: z.enum(['bj', 'ci', 'ga']),
  customer: z.object({
    name: z.string().trim().min(2, 'Nom trop court.'),
    // Volontairement permissif : la validation stricte du format et le HLR
    // lookup arrivent en Phase 2. Rejeter trop tôt coûte des vraies commandes.
    phone: z.string().trim().min(8, 'Numéro à 8 chiffres minimum.'),
    city: z.string().trim().min(2, 'Ville requise.'),
    address: z.string().trim().min(3, 'Indiquez un repère de livraison.'),
  }),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().positive().max(20),
      }),
    )
    .min(1, 'Panier vide.'),
  /** Identifiants publicitaires capturés dès la première visite. */
  attribution: z
    .object({
      fbp: z.string().optional(),
      fbc: z.string().optional(),
      ttp: z.string().optional(),
      ttclid: z.string().optional(),
    })
    .optional(),
});

ordersRouter.post('/orders', orderLimiter, async (req, res) => {
  const body = orderSchema.parse(req.body);

  const market = getMarket(body.market);
  if (!market?.enabled) {
    throw new HttpError(400, `Marché indisponible : ${body.market}`, 'market_disabled');
  }

  // ─── Anti-fraude · Phase 2 branchera IPQualityScore, FingerprintJS, HLR ───
  // Aucun signal collecté pour l'instant : le score est donc 0 et la décision
  // « accept ». Le moteur est déjà câblé pour que Phase 2 n'ait qu'à alimenter
  // le tableau de signaux.
  const signals: RiskSignal[] = [];
  const risk = assess(signals, { enforcement: env.FRAUD_ENFORCEMENT });

  const phoneE164 = normalizePhoneE164(body.customer.phone, market.phonePrefix);

  // ─── Tracking · l'event_id est alloué ici, côté serveur, une seule fois ───
  // Il est renvoyé au navigateur pour le pixel ET servira à l'envoi CAPI :
  // c'est ce partage qui garantit la déduplication.
  const submissionEvent = prepareEvent('Lead', {
    market: body.market,
    ...body.attribution,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // @todo Phase 1 — persister la commande (Supabase) et le snapshot du panier.
  // @todo Phase 3 — pousser l'événement CAPI en queue avec ce même event_id.
  const orderId = `VLR-${body.market.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

  req.log?.info(
    { orderId, market: body.market, score: risk.score, decision: risk.decision, applied: risk.applied },
    'order submitted',
  );

  res.status(201).json({
    order: {
      id: orderId,
      market: body.market,
      currency: market.currency,
      deliveryEstimate: market.deliveryEstimate,
      phoneE164,
    },
    tracking: { eventId: submissionEvent.eventId, event: submissionEvent.event },
  });
});
