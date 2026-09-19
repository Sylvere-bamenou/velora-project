'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatAmount, REASSURANCE_POINTS, type Market } from '@velora/design-system';
import { defaultSelection, findVariant, variantImage, type CatalogProduct } from '@/lib/catalog';
import { useCart } from './CartProvider';
import styles from './ProductFlow.module.css';

/**
 * Fiche produit : sélection de variante, galerie navigable, ajout au panier.
 * Le tunnel de commande vit désormais dans le panier puis le checkout.
 */
export function ProductDetail({ product, market }: { product: CatalogProduct; market: Market }) {
  const router = useRouter();
  const { add } = useCart();

  const [selection, setSelection] = useState<string[]>(() => defaultSelection(product));
  // null = suit l'image de la variante ; sinon index choisi dans la galerie.
  const [pickedImage, setPickedImage] = useState<number | null>(null);

  const variant = useMemo(() => findVariant(product, selection), [product, selection]);
  const gallery = product.images.map((i) => i.src);
  const image =
    pickedImage != null ? gallery[pickedImage] : variantImage(product, variant);
  const selectionLabel = selection.filter(Boolean).join(' · ');
  const cartSku = variant.sku ?? `${product.slug}-${variant.optionValues.join('-') || 'default'}`;

  function pickOption(index: number, value: string) {
    setSelection((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setPickedImage(null); // revenir à l'image de la variante choisie
  }

  function addToCart() {
    add({
      slug: product.slug,
      sku: cartSku,
      name: product.title,
      optionLabel: selectionLabel,
      image: image ?? null,
      unitPrice: variant.price,
    });
    router.push(`/${market}/panier`);
  }

  return (
    <div className={styles.frame}>
      <div className={styles.scroll}>
        <div className={styles.gallery}>
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.galleryImg} src={image} alt={product.title} />
          )}
        </div>

        {gallery.length > 1 && (
          <div className={styles.thumbs}>
            {gallery.slice(0, 5).map((src, i) => {
              const active = pickedImage === i || (pickedImage == null && src === image);
              return (
                <button
                  key={src}
                  className={`${styles.thumb} ${active ? styles.thumbActive : ''}`}
                  onClick={() => setPickedImage(i)}
                  aria-label={`Voir l'image ${i + 1}`}
                  aria-pressed={active}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.thumbImg} src={src} alt="" />
                </button>
              );
            })}
          </div>
        )}

        <div className={styles.body}>
          {product.productType && <div className={styles.eyebrow}>{product.productType}</div>}
          <h1 className={styles.title}>{product.title}</h1>

          <div className={styles.priceRow}>
            <div className={styles.priceNow}>
              <span className={variant.priceBefore ? styles.priceValuePromo : styles.priceValue}>
                {formatAmount(variant.price)}
              </span>
              <span className={styles.priceCurrency}>FCFA</span>
            </div>
            {variant.priceBefore && (
              <span className={styles.priceBefore}>{formatAmount(variant.priceBefore)} FCFA</span>
            )}
          </div>

          {product.options.map((option, i) => (
            <div key={option.name}>
              <div className={styles.label}>
                {option.name} — <b className={styles.labelValue}>{selection[i]}</b>
              </div>
              <div className={styles.chips}>
                {option.values.map((value) => (
                  <button
                    key={value}
                    className={`${styles.chip} ${selection[i] === value ? styles.chipActive : ''}`}
                    onClick={() => pickOption(i, value)}
                    aria-pressed={selection[i] === value}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {product.description && <p className={styles.description}>{product.description}</p>}

          <div className={styles.reassure}>
            {REASSURANCE_POINTS.map((r) => (
              <div key={r} className={styles.reassureItem}>
                <span className={styles.dot} />
                <span className={styles.reassureText}>{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className={styles.footer}>
        <button className={styles.cta} onClick={addToCart} disabled={!variant.available}>
          {variant.available ? 'Ajouter au panier' : 'Rupture de stock'}
          {variant.available && (
            <span className={styles.ctaAmount}>· {formatAmount(variant.price)} FCFA</span>
          )}
        </button>
      </footer>
    </div>
  );
}
