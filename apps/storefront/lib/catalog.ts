import raw from './catalog.generated.json';
import type { Market } from '@velora/design-system';

/**
 * Catalogue Velora, alimenté par l'import Shopify.
 *
 * Les données viennent de catalog.generated.json, produit par
 * scripts/import-shopify-catalog.mjs. Ne pas coder de produit en dur ici :
 * régénérer l'import à la place.
 */

export interface CatalogImage {
  src: string;
  alt: string | null;
}

export interface CatalogOption {
  name: string;
  values: string[];
}

export interface CatalogVariant {
  id: string;
  sku: string | null;
  /** Valeurs alignées sur l'ordre de `product.options`. */
  optionValues: string[];
  price: number;
  priceBefore: number | null;
  available: boolean;
  image: string | null;
}

export interface CatalogProduct {
  slug: string;
  title: string;
  vendor: string | null;
  productType: string | null;
  description: string;
  options: CatalogOption[];
  variants: CatalogVariant[];
  images: CatalogImage[];
  priceMin: number;
  priceMax: number;
  source: { platform: string; domain: string; productId: string };
}

const PRODUCTS = (raw.products as CatalogProduct[]).filter((p) => p.variants.length > 0);

const BY_SLUG = new Map(PRODUCTS.map((p) => [p.slug, p]));

export function allProducts(): CatalogProduct[] {
  return PRODUCTS;
}

export function getProduct(slug: string): CatalogProduct | undefined {
  return BY_SLUG.get(slug);
}

/** Première valeur de chaque option — la variante affichée par défaut. */
export function defaultSelection(product: CatalogProduct): string[] {
  return product.options.map((o) => o.values[0] ?? '');
}

/**
 * Résout la variante correspondant à une sélection d'options.
 * Sans option (produit mono-variante), renvoie la seule variante.
 */
export function findVariant(
  product: CatalogProduct,
  selection: string[],
): CatalogVariant {
  if (product.options.length === 0) return product.variants[0]!;
  const match = product.variants.find(
    (v) => v.optionValues.join('') === selection.join(''),
  );
  return match ?? product.variants[0]!;
}

/** Image principale : celle de la variante si elle en a une, sinon la 1re du produit. */
export function variantImage(product: CatalogProduct, variant: CatalogVariant): string | null {
  return variant.image ?? product.images[0]?.src ?? null;
}

export const IMPORT_SOURCE = raw._source as { domain: string; importedAt: string; count: number };

export const MARKETS: Market[] = ['bj', 'ci', 'ga'];
