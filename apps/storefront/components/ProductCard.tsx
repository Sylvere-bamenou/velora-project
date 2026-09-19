import Link from 'next/link';
import { formatAmount } from '@velora/design-system';
import type { CatalogProduct } from '@/lib/catalog';
import styles from './ProductCard.module.css';

/**
 * Carte produit en grille (spec §07 de l'identité).
 * États : défaut, promo (prix barré + badge), rupture (grisé, non cliquable).
 */
export function ProductCard({ product, market }: { product: CatalogProduct; market: string }) {
  const first = product.variants[0]!;
  const image = first.image ?? product.images[0]?.src ?? null;
  const inStock = product.variants.some((v) => v.available);
  const priceBefore = first.priceBefore;
  const discountPct = priceBefore
    ? Math.round(((priceBefore - first.price) / priceBefore) * 100)
    : 0;

  const inner = (
    <>
      <div className={styles.imageWrap}>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.image} src={image} alt={product.title} loading="lazy" />
        )}
        {discountPct > 0 && inStock && <span className={styles.badge}>−{discountPct} %</span>}
        {!inStock && <span className={styles.soldOut}>Rupture</span>}
      </div>
      <div className={styles.info}>
        {product.productType && <div className={styles.type}>{product.productType}</div>}
        <div className={styles.name}>{product.title}</div>
        <div className={styles.priceRow}>
          <span className={priceBefore ? styles.pricePromo : styles.price}>
            {formatAmount(first.price)} FCFA
          </span>
          {priceBefore && (
            <span className={styles.priceBefore}>{formatAmount(priceBefore)} FCFA</span>
          )}
        </div>
      </div>
    </>
  );

  if (!inStock) {
    return <div className={`${styles.card} ${styles.cardOut}`}>{inner}</div>;
  }

  return (
    <Link className={styles.card} href={`/${market}/produit/${product.slug}`}>
      {inner}
    </Link>
  );
}
