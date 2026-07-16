/**
 * Velora · Règles de marque exécutables.
 *
 * Ce que le CSS ne peut pas porter : le formatage des montants et la
 * micro-copie du tunnel COD. Centralisé ici pour que le storefront et
 * l'admin ne divergent jamais.
 */

/** Espace fine insécable U+202F — séparateur de milliers du guide (§05). */
const THIN_NBSP = ' ';

export type Market = 'bj' | 'ci' | 'ga';
export type Currency = 'XOF' | 'XAF';

export const MARKET_CURRENCY: Record<Market, Currency> = {
  bj: 'XOF',
  ci: 'XOF',
  ga: 'XAF',
};

/**
 * Le franc CFA n'a pas de sous-unité : les montants sont toujours entiers.
 * Un prix à virgule est un bug, pas un arrondi d'affichage.
 */
export function formatAmount(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, THIN_NBSP);
}

/**
 * Montant + devise, prêt à afficher.
 * Les deux marchés affichent « FCFA » : XOF et XAF partagent le sigle courant,
 * et c'est celui que le client lit sur les billets.
 */
export function formatPrice(value: number, _currency: Currency = 'XOF'): string {
  return `${formatAmount(value)}${THIN_NBSP}FCFA`;
}

export function priceForMarket(value: number, market: Market): string {
  return formatPrice(value, MARKET_CURRENCY[market]);
}

/**
 * Micro-copie du tunnel COD (§08 du guide).
 *
 * Le client ne paie rien en ligne : tout verbe de paiement au présent
 * ment sur ce qui se passe et casse la confiance au moment où elle compte.
 */
export const COD_COPY = {
  /** JAMAIS « Acheter maintenant » : il n'achète pas, il commande. */
  primaryCta: 'Commander — je paie à la livraison',
  /** JAMAIS « Paiement réussi » : aucun paiement n'a eu lieu. */
  confirmationTitle: 'Commande enregistrée',
  confirmationBody: 'On vous appelle pour confirmer.',
  /** JAMAIS « Paiement sécurisé garanti » : il n'y a pas de paiement en ligne. */
  deliveryPromise: 'Livré chez vous en 24–48 h. Vous payez le livreur.',
  /** JAMAIS « 100 % satisfait ou remboursé » : promesse de dropshipper. */
  reassurance: "Vous voyez l'article avant de régler.",
} as const;

export const REASSURANCE_POINTS = [
  'Livré chez vous en 24–48 h',
  'Vous inspectez avant de payer',
  'Paiement en espèces au livreur',
] as const;
