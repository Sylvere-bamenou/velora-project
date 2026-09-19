import type { Market } from '@velora/design-system';
import { REASSURANCE_POINTS } from '@velora/design-system';
import styles from './Footer.module.css';

const MARKET_NAME: Record<Market, string> = {
  bj: 'Bénin',
  ci: "Côte d'Ivoire",
  ga: 'Gabon',
};

/**
 * Pied de page global : réassurance COD, contact WhatsApp, mentions.
 * Le numéro WhatsApp est un espace réservé — il viendra de market_config.
 */
export function Footer({ market }: { market: Market }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <div className={styles.wordmark}>VELORA</div>
          <p className={styles.tagline}>Mode masculine premium · {MARKET_NAME[market]}</p>
        </div>

        <ul className={styles.reassure}>
          {REASSURANCE_POINTS.map((r) => (
            <li key={r} className={styles.reassureItem}>
              <span className={styles.dot} />
              {r}
            </li>
          ))}
        </ul>

        <div className={styles.contactCol}>
          <div className={styles.contactLabel}>Une question ?</div>
          <a className={styles.whatsapp} href="https://wa.me/22900000000">
            Écrire sur WhatsApp
          </a>
        </div>
      </div>

      <div className={styles.legal}>
        <span>© {new Date().getFullYear()} Velora</span>
        <span>Paiement à la livraison · aucun paiement en ligne</span>
      </div>
    </footer>
  );
}
