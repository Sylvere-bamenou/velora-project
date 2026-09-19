'use client';

import Link from 'next/link';
import type { Market } from '@velora/design-system';
import { useCart } from './CartProvider';
import styles from './Header.module.css';

/**
 * En-tête global des pages marché : retour au catalogue via le logotype,
 * accès au panier avec compteur. Présent sur catalogue, fiche, panier.
 */
export function Header({ market }: { market: Market }) {
  const { count } = useCart();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <span className={styles.spacer} />
        <Link href={`/${market}`} className={styles.wordmark} aria-label="Accueil Velora">
          VELORA
        </Link>
        <Link
          href={`/${market}/panier`}
          className={styles.cart}
          aria-label={`Panier, ${count} article${count > 1 ? 's' : ''}`}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
            <path
              d="M6 7h12l-1 12H7L6 7Z M9 7a3 3 0 0 1 6 0"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {count > 0 && <span className={styles.badge}>{count}</span>}
        </Link>
      </div>
    </header>
  );
}
