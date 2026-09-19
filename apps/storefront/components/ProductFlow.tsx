'use client';

import { useMemo, useState } from 'react';
import { formatAmount, priceForMarket, COD_COPY, REASSURANCE_POINTS, type Market } from '@velora/design-system';
import {
  defaultSelection,
  findVariant,
  variantImage,
  type CatalogProduct,
} from '@/lib/catalog';
import styles from './ProductFlow.module.css';

type Screen = 'product' | 'order' | 'confirm';

interface Props {
  product: CatalogProduct;
  market: Market;
  deliveryEstimate: string;
}

interface FormState {
  name: string;
  phone: string;
  city: string;
  address: string;
}

const EMPTY_FORM: FormState = { name: '', phone: '', city: 'Cotonou', address: '' };

function validate(form: FormState) {
  return {
    name: !form.name.trim(),
    phone: form.phone.replace(/\D/g, '').length < 8,
    address: !form.address.trim(),
  };
}

export function ProductFlow({ product, market, deliveryEstimate }: Props) {
  const [screen, setScreen] = useState<Screen>('product');
  const [selection, setSelection] = useState<string[]>(() => defaultSelection(product));
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [touched, setTouched] = useState(false);
  const [orderNo, setOrderNo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const variant = useMemo(() => findVariant(product, selection), [product, selection]);
  const image = variantImage(product, variant);
  const saving = variant.priceBefore ? variant.priceBefore - variant.price : 0;
  const discountPct = variant.priceBefore
    ? Math.round((saving / variant.priceBefore) * 100)
    : 0;

  const selectionLabel = selection.filter(Boolean).join(' · ');

  const errors = validate(form);
  const showErrors = touched ? errors : { name: false, phone: false, address: false };

  const setField = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function pickOption(optionIndex: number, value: string) {
    setSelection((prev) => {
      const next = [...prev];
      next[optionIndex] = value;
      return next;
    });
  }

  async function submit() {
    if (errors.name || errors.phone || errors.address) {
      setTouched(true);
      return;
    }
    setSubmitting(true);
    // @todo Phase 4 — POST /v1/orders, récupérer l'event_id renvoyé par l'API
    // et le passer au pixel navigateur pour la déduplication.
    setOrderNo(`VLR-${market.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`);
    setScreen('confirm');
    setSubmitting(false);
  }

  function back() {
    if (screen === 'confirm') {
      setForm(EMPTY_FORM);
      setTouched(false);
    }
    setScreen('product');
  }

  return (
    <div className={styles.frame}>
      <header className={styles.topBar}>
        {screen !== 'product' ? (
          <button className={styles.back} onClick={back} aria-label="Retour">
            ‹
          </button>
        ) : (
          <span className={styles.topSpacer} />
        )}
        <span className={styles.wordmark}>VELORA</span>
        <span className={styles.topSpacer} />
      </header>

      <div className={styles.scroll}>
        {screen === 'product' && (
          <div className={styles.screen}>
            <div className={styles.gallery}>
              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.galleryImg} src={image} alt={product.title} />
              )}
              {discountPct > 0 && <span className={styles.promoBadge}>−{discountPct} %</span>}
            </div>

            {product.images.length > 1 && (
              <div className={styles.thumbs}>
                {product.images.slice(0, 4).map((img, i) => (
                  <span key={img.src} className={`${styles.thumb} ${i === 0 ? styles.thumbActive : ''}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className={styles.thumbImg} src={img.src} alt="" />
                  </span>
                ))}
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
              {saving > 0 && (
                <div className={styles.saving}>Vous économisez {formatAmount(saving)} FCFA</div>
              )}

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

              {product.description && (
                <p className={styles.description}>{product.description}</p>
              )}

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
        )}

        {screen === 'order' && (
          <div className={`${styles.screen} ${styles.body}`}>
            <h2>Vos coordonnées</h2>
            <p className={styles.formIntro}>
              On vous appelle pour confirmer avant l&apos;envoi. Aucun paiement en ligne.
            </p>

            <div className={styles.recap}>
              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.recapImg} src={image} alt="" />
              )}
              <div className={styles.recapMain}>
                <div className={styles.recapName}>{product.title}</div>
                {selectionLabel && <div className={styles.recapVariant}>{selectionLabel}</div>}
              </div>
              <div className={styles.recapPrice}>
                {formatAmount(variant.price)}
                <div className={styles.recapCurrency}>FCFA</div>
              </div>
            </div>

            <div className={styles.fields}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Nom complet</span>
                <input
                  className={`${styles.input} ${showErrors.name ? styles.inputError : ''}`}
                  value={form.name}
                  onChange={setField('name')}
                  placeholder="Ex. Kofi Mensah"
                  autoComplete="name"
                  aria-invalid={showErrors.name}
                />
                {showErrors.name && <span className={styles.errorText}>Indiquez votre nom.</span>}
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Téléphone (WhatsApp de préférence)</span>
                <input
                  className={`${styles.input} ${showErrors.phone ? styles.inputError : ''}`}
                  value={form.phone}
                  onChange={setField('phone')}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+229 01 97 00 00 00"
                  aria-invalid={showErrors.phone}
                />
                {showErrors.phone && (
                  <span className={styles.errorText}>Numéro à 8 chiffres minimum.</span>
                )}
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Ville</span>
                <input
                  className={styles.input}
                  value={form.city}
                  onChange={setField('city')}
                  autoComplete="address-level2"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Adresse / repère de livraison</span>
                <input
                  className={`${styles.input} ${showErrors.address ? styles.inputError : ''}`}
                  value={form.address}
                  onChange={setField('address')}
                  placeholder="Quartier, repère proche…"
                  autoComplete="street-address"
                  aria-invalid={showErrors.address}
                />
                {showErrors.address && (
                  <span className={styles.errorText}>Indiquez un repère de livraison.</span>
                )}
              </label>
            </div>

            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>À régler au livreur</span>
              <span className={styles.totalValue}>{priceForMarket(variant.price, market)}</span>
            </div>
          </div>
        )}

        {screen === 'confirm' && (
          <div className={`${styles.screen} ${styles.confirm}`}>
            <div className={styles.check}>✓</div>
            <h2 className={styles.confirmTitle}>{COD_COPY.confirmationTitle}</h2>
            <p className={styles.confirmBody}>
              Merci {form.name.trim().split(/\s+/)[0]}. <b>On vous appelle pour confirmer</b> sur le{' '}
              {form.phone}, puis le livreur passe.
            </p>

            <div className={styles.receipt}>
              <div className={styles.receiptRow}>
                <span className={styles.receiptKey}>Commande</span>
                <span className={`${styles.receiptVal} ${styles.receiptMono}`}>{orderNo}</span>
              </div>
              <div className={styles.receiptRow}>
                <span className={styles.receiptKey}>Article</span>
                <span className={styles.receiptVal}>
                  {product.title}
                  {selectionLabel ? ` · ${selectionLabel}` : ''}
                </span>
              </div>
              <div className={styles.receiptRow}>
                <span className={styles.receiptKey}>Livraison</span>
                <span className={styles.receiptVal}>
                  {form.city} · {deliveryEstimate}
                </span>
              </div>
              <div className={styles.receiptTotal}>
                <span className={styles.receiptTotalKey}>À payer en espèces</span>
                <span className={styles.receiptTotalVal}>{priceForMarket(variant.price, market)}</span>
              </div>
            </div>

            <div className={styles.confirmNote}>
              <span className={styles.dot} />
              {COD_COPY.reassurance}
            </div>
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        {screen === 'product' && (
          <button className={styles.cta} onClick={() => setScreen('order')} disabled={!variant.available}>
            {variant.available ? COD_COPY.primaryCta : 'Rupture de stock'}
            {variant.available && (
              <span className={styles.ctaAmount}>· {formatAmount(variant.price)}</span>
            )}
          </button>
        )}
        {screen === 'order' && (
          <>
            <button className={styles.cta} onClick={submit} disabled={submitting}>
              Confirmer ma commande
            </button>
            <div className={styles.footerNote}>
              Paiement en espèces à la réception · sans engagement en ligne
            </div>
          </>
        )}
        {screen === 'confirm' && (
          <button className={styles.ctaGhost} onClick={back}>
            Continuer mes achats
          </button>
        )}
      </footer>
    </div>
  );
}
