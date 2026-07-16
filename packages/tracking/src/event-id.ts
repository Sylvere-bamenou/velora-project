import { randomUUID, createHash } from 'node:crypto';

/**
 * Génération d'`event_id` pour la déduplication Meta / TikTok.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ATTENTION — écart assumé avec le plan de développement v1.0 (§4).
 *
 * Le plan spécifie le format :
 *     velora_{marché}_{orderId}_{eventName}_{timestamp}
 *
 * Ce format casse la déduplication qu'il est censé garantir :
 *
 *   1. Le timestamp. La dédup exige que le pixel navigateur et CAPI envoient
 *      le MÊME event_id. Calculé de chaque côté, il diverge de quelques
 *      millisecondes et Meta compte deux événements au lieu d'un — l'inverse
 *      exact de l'objectif.
 *
 *   2. Pas d'orderId. PageView, Search, ViewContent et AddToCart surviennent
 *      avant toute commande. Le champ serait vide sur la majorité du funnel.
 *
 *   3. Un ID déterministe (sans timestamp) serait pire encore : deux
 *      AddToCart légitimes du même produit se dédupliqueraient en un seul.
 *
 * La règle correcte : un UUID aléatoire, généré UNE FOIS côté serveur,
 * passé au navigateur ET à CAPI, persisté en base. L'ID n'a pas à être
 * lisible — il doit être unique et partagé.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type Market = 'bj' | 'ci' | 'ga';

export type EventName =
  | 'PageView'
  | 'Search'
  | 'ViewContent'
  | 'AddToCart'
  | 'ViewCart'
  | 'InitiateCheckout'
  | 'Lead'
  | 'Purchase'
  | 'Confirmed'
  | 'Returned'
  | 'FraudDetected';

/**
 * Crée un event_id neuf. À appeler une seule fois par événement, côté serveur.
 * Le résultat doit être transmis au pixel navigateur et à CAPI, puis stocké
 * dans `tracking_events.event_id`.
 *
 * Le préfixe lisible n'a aucun rôle fonctionnel : il sert uniquement à
 * débugger l'event log à l'œil. L'unicité vient entièrement de l'UUID.
 */
export function newEventId(market: Market, event: EventName): string {
  return `vel_${market}_${event.toLowerCase()}_${randomUUID()}`;
}

/**
 * Hachage des PII avant envoi CAPI.
 * Meta et TikTok exigent SHA256 sur une valeur normalisée : minuscules,
 * sans accents, sans espaces superflus. Normaliser différemment des deux
 * côtés dégrade silencieusement le taux de matching.
 */
export function hashPii(raw: string): string {
  const normalized = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Normalise un numéro au format E.164 avant hachage.
 *
 * Le téléphone est le signal de matching le plus fort en COD, et c'est aussi
 * la clé de la blacklist. Deux normalisations différentes du même numéro
 * créent deux identités : le matching publicitaire se dégrade en silence, et
 * un numéro banni en format international repasse en format local.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NE PAS retirer le zéro initial.
 *
 * Au Bénin (+229) et en Côte d'Ivoire (+225), les renumérotations ont fait du
 * `0` un chiffre du numéro national, pas un préfixe interurbain à supprimer :
 *   `01 97 12 34 56` → `2290197123456`   ✓
 *   `01 97 12 34 56` → `229197123456`    ✗ (identité distincte du même client)
 *
 * @todo Phase 2 — remplacer par libphonenumber-js avant le HLR lookup.
 * Cette fonction ne connaît pas les longueurs valides par pays ni les
 * variantes de trunk prefix : elle préfixe et concatène, sans plus. Elle
 * suffit tant qu'aucune décision n'est prise sur sa sortie ; elle ne suffira
 * pas pour interroger Africa's Talking ni pour bannir.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function normalizePhoneE164(raw: string, countryCode: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith(countryCode)) return digits;
  return countryCode + digits;
}
