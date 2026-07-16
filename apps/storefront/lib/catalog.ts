import type { Market } from '@velora/design-system';

/**
 * Catalogue de démonstration — Phase 0.
 *
 * Reproduit le produit du prototype Claude Design. Passera en table Supabase
 * (`products` / `variants`) en Phase 4, avec prix et stock par variante.
 */

export interface PackOption {
  id: string;
  label: string;
  qty: number;
  /** Remise fractionnaire : 0.15 = −15 %. */
  discount: number;
  tag?: string;
}

export interface Product {
  slug: string;
  category: string;
  name: string;
  /** Prix unitaire, en unité entière de devise (le FCFA n'a pas de centimes). */
  unitPrice: number;
  unitPriceBefore: number;
  colors: Array<{ name: string; swatch: string; image: string }>;
  sizes: string[];
  packs: PackOption[];
  gallery: string[];
}

export const CHRONO: Product = {
  slug: 'montre-chronographe-acier',
  category: 'Montres · acier',
  name: 'Montre chronographe acier',
  unitPrice: 25_000,
  unitPriceBefore: 35_000,
  colors: [
    { name: 'Noir', swatch: '#1b1813', image: '/assets/prod-chrono.svg' },
    { name: 'Or', swatch: '#c8a24a', image: '/assets/prod-watch-gold.svg' },
  ],
  sizes: ['40 mm', '42 mm'],
  packs: [
    { id: 'x1', label: '×1', qty: 1, discount: 0 },
    { id: 'x3', label: '×3', qty: 3, discount: 0.15, tag: '−15 %' },
    { id: 'x5', label: '×5', qty: 5, discount: 0.2, tag: '−20 %' },
  ],
  gallery: ['/assets/photo-detail.svg', '/assets/photo-lifestyle.svg'],
};

const CATALOG: Record<string, Product> = { [CHRONO.slug]: CHRONO };

export function getProduct(slug: string): Product | undefined {
  return CATALOG[slug];
}

/**
 * Total d'un pack. Arrondi à l'entier : un montant FCFA à virgule est un bug
 * d'affichage, pas un arrondi acceptable.
 */
export function packTotal(product: Product, pack: PackOption): number {
  return Math.round(product.unitPrice * pack.qty * (1 - pack.discount));
}

export const MARKETS: Market[] = ['bj', 'ci', 'ga'];
