export { newEventId, hashPii, normalizePhoneE164 } from './event-id.js';
export type { Market, EventName } from './event-id.js';

/**
 * Squelette du service unifié `track()` (Phase 3 du plan).
 *
 * Phase 0 pose l'interface et la garantie de déduplication ; les appels
 * réseau vers Meta CAPI et TikTok Events API arrivent en Phase 3.
 */
import { newEventId } from './event-id.js';
import type { Market, EventName } from './event-id.js';

export interface TrackContext {
  market: Market;
  /** Identifiants publicitaires capturés dès la première visite et persistés. */
  fbp?: string;
  fbc?: string;
  ttp?: string;
  ttclid?: string;
  ip?: string;
  userAgent?: string;
}

export interface TrackPayload {
  value?: number;
  currency?: 'XOF' | 'XAF';
  contents?: Array<{ id: string; quantity: number; price: number }>;
  orderId?: string;
}

export interface TrackResult {
  /** À passer au pixel navigateur ET à CAPI — c'est ce partage qui déduplique. */
  eventId: string;
  event: EventName;
  market: Market;
}

/**
 * Prépare un événement : alloue l'event_id partagé et le renvoie.
 *
 * L'appelant doit :
 *   1. persister l'événement en base (statut `pending`) ;
 *   2. renvoyer `eventId` au navigateur pour le pixel ;
 *   3. pousser l'envoi CAPI dans la queue avec le MÊME eventId.
 *
 * @todo Phase 3 — brancher pg-boss, Meta CAPI, TikTok Events API.
 */
export function prepareEvent(
  event: EventName,
  ctx: TrackContext,
  _payload: TrackPayload = {},
): TrackResult {
  return {
    eventId: newEventId(ctx.market, event),
    event,
    market: ctx.market,
  };
}
