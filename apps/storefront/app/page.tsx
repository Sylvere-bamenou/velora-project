import Link from 'next/link';
import { CHRONO } from '@/lib/catalog';
import styles from './page.module.css';

/**
 * Page d'entrée velora.com — sélection de marché.
 *
 * @todo Phase 7 — détection IP et redirection automatique vers /bj, /ci, /ga.
 * En Phase 0, seul le Bénin est ouvert.
 */
export default function HomePage() {
  return (
    <main className={styles.main}>
      <div className={styles.wordmark}>VELORA</div>
      <p className={styles.tagline}>Mode masculine premium · Afrique</p>

      <nav className={styles.markets}>
        <Link className={styles.market} href={`/bj/produit/${CHRONO.slug}`}>
          <span className={styles.marketName}>Bénin</span>
          <span className={styles.marketMeta}>XOF · Livraison 24–48 h</span>
        </Link>
        <span className={`${styles.market} ${styles.marketSoon}`}>
          <span className={styles.marketName}>Côte d&apos;Ivoire</span>
          <span className={styles.marketMeta}>Bientôt</span>
        </span>
        <span className={`${styles.market} ${styles.marketSoon}`}>
          <span className={styles.marketName}>Gabon</span>
          <span className={styles.marketMeta}>Bientôt</span>
        </span>
      </nav>

      <p className={styles.note}>Vous payez le livreur en espèces, à la réception.</p>
    </main>
  );
}
