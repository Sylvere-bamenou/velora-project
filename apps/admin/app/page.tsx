import { formatAmount } from '@velora/design-system';
import { DEFAULT_THRESHOLDS } from '@velora/fraud';
import styles from './page.module.css';

/**
 * File de commandes — module principal du dashboard (§8 du plan).
 *
 * Phase 0 : données factices, lecture seule. Phase 1 branchera l'API Shopify,
 * Phase 2 le vrai moteur de score.
 */

interface Row {
  id: string;
  score: number;
  client: string;
  phone: string;
  product: string;
  amount: number;
  market: string;
  signal: string;
}

const ROWS: Row[] = [
  { id: 'VLR-BJ-402118', score: 8, client: 'Kofi Mensah', phone: '+229 01 97 00 00 00', product: 'Chrono acier ×1', amount: 25000, market: 'bj', signal: '—' },
  { id: 'VLR-BJ-402117', score: 12, client: 'Awa Diallo', phone: '+229 01 96 00 00 00', product: 'Portefeuille cuir', amount: 18000, market: 'bj', signal: '—' },
  { id: 'VLR-BJ-402115', score: 44, client: 'Yao Koffi', phone: '+229 01 95 00 00 00', product: 'Chrono acier ×3', amount: 63750, market: 'bj', signal: 'IP hors marché' },
  { id: 'VLR-BJ-402112', score: 78, client: 'Compte test', phone: '+229 01 00 00 00 00', product: 'Chrono acier ×5', amount: 100000, market: 'bj', signal: 'VPN · numéro VoIP' },
];

/** Le triplet sémantique du guide — lisible en un coup d'œil sur une ligne dense. */
function tone(score: number) {
  if (score >= DEFAULT_THRESHOLDS.block) return { cls: styles.danger, label: 'Blocage suggéré' };
  if (score >= DEFAULT_THRESHOLDS.review) return { cls: styles.warning, label: 'Vérification' };
  return { cls: styles.success, label: 'Accepté' };
}

export default function OrdersPage() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <span className={styles.wordmark}>VELORA</span>
        <span className={styles.section}>File de commandes</span>
        <span className={styles.shadowBadge}>anti-fraude · shadow mode</span>
      </header>

      <p className={styles.notice}>
        Le moteur score et journalise, mais ne bloque pas. Les décisions affichées sont
        <b> ce qui serait appliqué</b> si l&apos;enforcement était actif.
      </p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thNum}>Score</th>
              <th>Commande</th>
              <th>Client</th>
              <th>Article</th>
              <th className={styles.thNum}>Montant</th>
              <th>Signaux</th>
              <th>Décision</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const t = tone(r.score);
              return (
                <tr key={r.id}>
                  <td className={styles.tdNum}>
                    <span className={`${styles.score} ${t.cls}`}>{r.score}</span>
                  </td>
                  <td className={styles.mono}>{r.id}</td>
                  <td>
                    <div>{r.client}</div>
                    <div className={styles.muted}>{r.phone}</div>
                  </td>
                  <td>{r.product}</td>
                  <td className={styles.tdNum}>{formatAmount(r.amount)}</td>
                  <td className={styles.muted}>{r.signal}</td>
                  <td>
                    <span className={`${styles.badge} ${t.cls}`}>{t.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
