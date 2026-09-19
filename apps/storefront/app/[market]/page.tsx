import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { allProducts } from '@/lib/catalog';
import { parseMarket } from '@/lib/markets';
import { ProductCard } from '@/components/ProductCard';
import styles from './page.module.css';

interface PageProps {
  params: Promise<{ market: string }>;
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
      <p className={styles.tagline}>Livré en 24–48 h · payez le livreur en espèces</p>
      <div className={styles.grid}>
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} market={market} />
        ))}
      </div>
    </main>
  );
}
