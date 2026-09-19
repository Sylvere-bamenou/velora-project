'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Market } from '@velora/design-system';

/**
 * Panier multi-produits, persisté par marché.
 *
 * La clé du panier est le SKU (la variante), pas le produit : deux variantes
 * d'un même produit sont deux lignes. Persisté en localStorage pour survivre
 * à un rechargement, avec garde try/catch (navigation privée, quota).
 */
export interface CartItem {
  slug: string;
  sku: string;
  name: string;
  optionLabel: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  add: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  setQuantity: (sku: string, quantity: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const storageKey = (market: Market) => `velora_cart_${market}`;

function load(market: Market): CartItem[] {
  try {
    const raw = localStorage.getItem(storageKey(market));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ market, children }: { market: Market; children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Chargement au montage (client uniquement, après hydratation).
  useEffect(() => {
    setItems(load(market));
    setHydrated(true);
  }, [market]);

  // Persistance à chaque changement, une fois hydraté (sinon on écraserait
  // le panier stocké avec l'état initial vide au premier rendu).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey(market), JSON.stringify(items));
    } catch {
      // quota plein ou stockage bloqué : le panier reste en mémoire.
    }
  }, [items, market, hydrated]);

  const add = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.sku === item.sku);
      if (existing) {
        return prev.map((i) =>
          i.sku === item.sku ? { ...i, quantity: Math.min(i.quantity + quantity, 20) } : i,
        );
      }
      return [...prev, { ...item, quantity: Math.min(quantity, 20) }];
    });
  }, []);

  const setQuantity = useCallback((sku: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.sku !== sku)
        : prev.map((i) => (i.sku === sku ? { ...i, quantity: Math.min(quantity, 20) } : i)),
    );
  }, []);

  const remove = useCallback((sku: string) => {
    setItems((prev) => prev.filter((i) => i.sku !== sku));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      total: items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
    }),
    [items, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart doit être utilisé dans un CartProvider');
  return ctx;
}
