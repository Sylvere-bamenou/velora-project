import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { Market } from '@velora/design-system';
import { allProducts } from '@/lib/catalog';
import { ProductCard } from '@/components/ProductCard';
import styles from './page.module.css';

const ENABLED_MARKETS: Market[] = ['bj'];

interface PageProps {
  params: Promise<{ market: string }>;
}

function parseMarket(value: string): Market | null {
  return (ENABLED_MARKETS as string[]).includes(value) ? (value as Market) : null;
}

export function generateStaticParams() {
  return ENABLED_MARKETS.map((market) => ({ market }));
}

export const metadata: Metadata = {
  title: 'Velora — Mode masculine premium',
  description: 'Livré chez vous en 24–48 h, vous payez le livreur en espèces.',
};

export default async function MarketPage({ params }: PageProps) {
  const { market: rawMarket } = await params;
  const market = parseMarket(rawMarket);
  if (!market) notFound();

  const products = allProducts();

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <span className={styles.wordmark}>VELORA</span>
        <p className={styles.tagline}>Livré en 24–48 h · payez le livreur en espèces</p>
      </header>

      <div className={styles.grid}>
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} market={market} />
        ))}
      </div>
    </main>
  );
}
