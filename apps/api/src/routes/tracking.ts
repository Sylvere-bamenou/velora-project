import { Router } from 'express';
import { z } from 'zod';
import { prepareEvent } from '@velora/tracking';

export const trackingRouter: Router = Router();

const eventSchema = z.object({
  market: z.enum(['bj', 'ci', 'ga']),
  event: z.enum([
    'PageView',
    'Search',
    'ViewContent',
    'AddToCart',
    'ViewCart',
    'InitiateCheckout',
  ]),
  value: z.number().nonnegative().optional(),
  currency: z.enum(['XOF', 'XAF']).optional(),
  contents: z
    .array(z.object({ id: z.string(), quantity: z.number().int().positive(), price: z.number() }))
    .optional(),
  attribution: z
    .object({
      fbp: z.string().optional(),
      fbc: z.string().optional(),
      ttp: z.string().optional(),
      ttclid: z.string().optional(),
    })
    .optional(),
});

/**
 * Alloue un event_id pour un événement de funnel.
 *
 * Le navigateur appelle cette route AVANT de déclencher son pixel, puis
 * utilise l'`eventId` retourné. Le serveur enverra CAPI avec le même — c'est
 * la seule façon d'obtenir une déduplication fiable.
 *
 * Générer l'id côté navigateur casserait la garantie : le serveur ne pourrait
 * plus le reproduire.
 */
trackingRouter.post('/tracking/events', async (req, res) => {
  const body = eventSchema.parse(req.body);

  const result = prepareEvent(
    body.event,
    {
      market: body.market,
      ...body.attribution,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
    { value: body.value, currency: body.currency, contents: body.contents },
  );

  // @todo Phase 3 — insérer dans `tracking_events` (statut `pending`) puis
  // pousser l'envoi CAPI en queue pg-boss, idempotent sur event_id.

  res.status(201).json({ eventId: result.eventId, event: result.event });
});
