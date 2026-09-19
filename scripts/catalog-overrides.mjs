/**
 * Curation du catalogue importé.
 *
 * L'import Shopify apporte des données brutes de dropshipping : noms
 * argumentaires, marques tierces, faux prix barrés. Ce fichier les corrige
 * SANS toucher aux données générées (qui sont écrasées à chaque import) :
 * il est appliqué par scripts/import-shopify-catalog.mjs.
 *
 * C'est le seul endroit à éditer pour renommer, masquer ou dé-solder un
 * produit. Tout est réversible en une ligne.
 */

/**
 * Par défaut, on retire les prix barrés hérités de Shopify : ce sont des
 * ancres de remise factices (tout était « en solde »), exactement le ressort
 * que le positionnement premium doit éviter. Pour une vraie promotion,
 * mettre `keepCompareAt: true` sur le produit concerné.
 */
export const DEFAULT_KEEP_COMPARE_AT = false;

/**
 * Overrides par slug.
 *   name          : nom sobre, court, sans ™ ni argumentaire (va en description)
 *   active        : false = masqué du catalogue (réversible)
 *   keepCompareAt : true = garde le prix barré (vraie promo)
 */
export const OVERRIDES = {
  'hbelt-tg': { name: 'Ceinture sans boucle en cuir' },
  // Doublon de hbelt-tg (même produit, autre prix). Masqué, pas supprimé.
  hbelt: { active: false, reason: 'doublon de hbelt-tg' },

  'tomi-dynasty-t106': { name: 'Montre à double cadran' },
  'ceinture-aurion': { name: 'Ceinture automatique en cuir' },
  vaultpop: { name: 'Portefeuille RFID pop-up' },
  cotonpur: { name: 'Pack de 3 boxers coton' },
  'arctic-vector': { name: 'Sacoche bandoulière' },
  silkflow: { name: 'Lot de 6 boxers respirants' },

  // Hors positionnement « mode masculine premium ». Masqué en attendant une
  // décision : passer active à true pour le réafficher.
  'born-pretty-kit': { active: false, reason: 'hors positionnement mode masculine' },
};

/** Applique l'override d'un produit sur son objet catalogue (mutation). */
export function applyOverride(product) {
  const o = OVERRIDES[product.slug] ?? {};

  if (o.name) product.title = o.name;
  product.active = o.active !== false;

  const keepCompareAt = o.keepCompareAt ?? DEFAULT_KEEP_COMPARE_AT;
  if (!keepCompareAt) {
    for (const v of product.variants) v.priceBefore = null;
    product.priceBefore = null;
  }
  return product;
}
