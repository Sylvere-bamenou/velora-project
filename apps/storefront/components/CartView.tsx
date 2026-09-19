'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatAmount, priceForMarket, type Market } from '@velora/design-system';
import { useCart } from './CartProvider';
import styles from './CartView.module.css';

export function CartView({ market }: { market: Market }) {
  const router = useRouter();
  const { items, total, count, setQuantity, remove } = useCart();

  if (count === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>Votre panier est vide.</p>
        <Link href={`/${market}`} className={styles.ghost}>
          Voir les produits
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Votre panier</h1>

      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.sku} className={styles.item}>
            {item.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.image} src={item.image} alt="" />
            )}
            <div className={styles.info}>
              <div className={styles.name}>{item.name}</div>
              {item.optionLabel && <div className={styles.option}>{item.optionLabel}</div>}
              <div className={styles.unit}>{formatAmount(item.unitPrice)} FCFA</div>

              <div className={styles.qtyRow}>
                <div className={styles.stepper}>
                  <button
                    className={styles.stepBtn}
                    onClick={() => setQuantity(item.sku, item.quantity - 1)}
                    aria-label="Diminuer la quantité"
                  >
                    −
                  </button>
                  <span className={styles.qty}>{item.quantity}</span>
                  <button
                    className={styles.stepBtn}
                    onClick={() => setQuantity(item.sku, item.quantity + 1)}
                    aria-label="Augmenter la quantité"
                  >
                    +
                  </button>
                </div>
                <button className={styles.remove} onClick={() => remove(item.sku)}>
                  Retirer
                </button>
              </div>
            </div>
            <div className={styles.lineTotal}>
              {formatAmount(item.unitPrice * item.quantity)}
              <span className={styles.lineCurrency}>FCFA</span>
            </div>
          </li>
        ))}
      </ul>

      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span>Sous-total</span>
          <span className={styles.summaryValue}>{priceForMarket(total, market)}</span>
        </div>
        <p className={styles.summaryNote}>
          Livraison calculée à la confirmation. Vous payez le livreur en espèces.
        </p>
      </div>

      <div className={styles.actions}>
        <button className={styles.cta} onClick={() => router.push(`/${market}/commande`)}>
          Commander — je paie à la livraison
        </button>
        <Link href={`/${market}`} className={styles.ghost}>
          Continuer mes achats
        </Link>
      </div>
    </div>
  );
}
