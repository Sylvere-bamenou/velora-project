import rateLimit from 'express-rate-limit';

/**
 * Rate limiting.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * AVERTISSEMENT CGNAT — à lire avant de durcir ces valeurs.
 *
 * Les réseaux mobiles ouest-africains partagent massivement les IP publiques
 * entre abonnés. Une limite par IP calibrée sur des hypothèses européennes
 * bloque un quartier entier de Cotonou derrière un seul compteur.
 *
 * Les limites ci-dessous sont donc volontairement larges : elles visent
 * l'abus grossier (scraping, bourrage de formulaire), pas la fraude — la
 * fraude COD se traite au score, pas au compteur d'IP.
 *
 * Le store est en mémoire tant que le service tourne en une instance. Passer
 * au store Redis Upstash AVANT de scaler l'API : sinon chaque instance
 * compte séparément et la limite effective est multipliée par leur nombre.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Limite générale, large — filet anti-abus seulement. */
export const generalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Trop de requêtes.' } },
});

/**
 * Soumission de commande — plus serrée, mais toujours au-dessus de ce qu'un
 * foyer ou un cybercafé partageant une IP peut légitimement produire.
 */
export const orderLimiter = rateLimit({
  windowMs: 10 * 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: { code: 'rate_limited', message: 'Trop de commandes. Réessayez dans quelques minutes.' },
  },
});
