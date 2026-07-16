'use client';

import { useMemo, useState } from 'react';
import {
  formatAmount,
  priceForMarket,
  COD_COPY,
  REASSURANCE_POINTS,
  type Market,
} from '@velora/design-system';
import { packTotal, type Product } from '@/lib/catalog';
import styles from './ProductFlow.module.css';

type Screen = 'product' | 'order' | 'confirm';

interface Props {
  product: Product;
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

/** Mêmes règles que le schéma zod de l'API — volontairement permissives. */
function validate(form: FormState) {
  return {
    name: !form.name.trim(),
    phone: form.phone.replace(/\D/g, '').length < 8,
    address: !form.address.trim(),
  };
}

export function ProductFlow({ product, market, deliveryEstimate }: Props) {
  const [screen, setScreen] = useState<Screen>('product');
  const [colorName, setColorName] = useState(product.colors[0]!.name);
  const [size, setSize] = useState(product.sizes[0]!);
  const [packId, setPackId] = useState(product.packs[0]!.id);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [touched, setTouched] = useState(false);
  const [orderNo, setOrderNo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const color = product.colors.find((c) => c.name === colorName)!;
  const pack = product.packs.find((p) => p.id === packId)!;
  const total = useMemo(() => packTotal(product, pack), [product, pack]);
  const saving = product.unitPriceBefore - product.unitPrice;
  const discountPct = Math.round((saving / product.unitPriceBefore) * 100);

  const errors = validate(form);
  const showErrors = touched ? errors : { name: false, phone: false, address: false };

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.galleryImg} src={color.image} alt={product.name} />
              <span className={styles.promoBadge}>−{discountPct} %</span>
            </div>

            <div className={styles.thumbs}>
              {[color.image, ...product.gallery].map((img, i) => (
                <button
                  key={img}
                  className={`${styles.thumb} ${i === 0 ? styles.thumbActive : ''}`}
                  aria-label={`Vue ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.thumbImg} src={img} alt="" />
                </button>
              ))}
            </div>

            <div className={styles.body}>
              <div className={styles.eyebrow}>{product.category}</div>
              <h1 className={styles.title}>{product.name}</h1>

              <div className={styles.priceRow}>
                <div className={styles.priceNow}>
                  <span className={styles.priceValue}>{formatAmount(product.unitPrice)}</span>
                  <span className={styles.priceCurrency}>FCFA</span>
                </div>
                <span className={styles.priceBefore}>
                  {formatAmount(product.unitPriceBefore)} FCFA
                </span>
              </div>
              <div className={styles.saving}>Vous économisez {formatAmount(saving)} FCFA</div>

              <div className={styles.label}>
                Couleur — <b className={styles.labelValue}>{color.name}</b>
              </div>
              <div className={styles.swatches}>
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    className={`${styles.swatch} ${c.name === colorName ? styles.swatchActive : ''}`}
                    style={{ background: c.swatch }}
                    onClick={() => setColorName(c.name)}
                    aria-label={c.name}
                    aria-pressed={c.name === colorName}
                  />
                ))}
              </div>

              <div className={styles.label}>Boîtier</div>
              <div className={styles.chips}>
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    className={`${styles.chip} ${s === size ? styles.chipActive : ''}`}
                    onClick={() => setSize(s)}
                    aria-pressed={s === size}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className={styles.label}>Pack</div>
              <div className={styles.packs}>
                {product.packs.map((p) => {
                  const active = p.id === packId;
                  // Sans libellé explicite, le nom accessible se calcule par
                  // concaténation du texte : « ×1 » + « 25 000 FCFA » donne
                  // « ×125 000 FCFA », que le lecteur d'écran annonce comme un
                  // prix de 125 000. Le montant est justement ce que le client
                  // COD doit entendre juste.
                  const label = [
                    `Pack ${p.label}`,
                    p.tag ? `remise ${p.tag}` : null,
                    priceForMarket(packTotal(product, p), market),
                  ]
                    .filter(Boolean)
                    .join(', ');
                  return (
                    <button
                      key={p.id}
                      className={`${styles.pack} ${active ? styles.packActive : ''}`}
                      onClick={() => setPackId(p.id)}
                      aria-pressed={active}
                      aria-label={label}
                    >
                      <span className={styles.packLeft}>
                        <span className={`${styles.radio} ${active ? styles.radioActive : ''}`}>
                          <span
                            className={`${styles.radioDot} ${active ? styles.radioDotActive : ''}`}
                          />
                        </span>
                        <span className={styles.packLabel}>{p.label}</span>
                        {p.tag && <span className={styles.packTag}>{p.tag}</span>}
                      </span>
                      <span className={styles.packPrice}>
                        {formatAmount(packTotal(product, p))} FCFA
                      </span>
                    </button>
                  );
                })}
              </div>

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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.recapImg} src={color.image} alt="" />
              <div className={styles.recapMain}>
                <div className={styles.recapName}>{product.name}</div>
                <div className={styles.recapVariant}>
                  {color.name} · {size} · Pack {pack.label}
                </div>
              </div>
              <div className={styles.recapPrice}>
                {formatAmount(total)}
                <div className={styles.recapCurrency}>FCFA</div>
              </div>
            </div>

            <div className={styles.fields}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Nom complet</span>
                <input
                  className={`${styles.input} ${showErrors.name ? styles.inputError : ''}`}
                  value={form.name}
                  onChange={set('name')}
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
                  onChange={set('phone')}
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
                  onChange={set('city')}
                  autoComplete="address-level2"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Adresse / repère de livraison</span>
                <input
                  className={`${styles.input} ${showErrors.address ? styles.inputError : ''}`}
                  value={form.address}
                  onChange={set('address')}
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
              <span className={styles.totalValue}>{priceForMarket(total, market)}</span>
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
                  {product.name} · {color.name} · {pack.label}
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
                <span className={styles.receiptTotalVal}>{priceForMarket(total, market)}</span>
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
          <button className={styles.cta} onClick={() => setScreen('order')}>
            {COD_COPY.primaryCta}
            <span className={styles.ctaAmount}>· {formatAmount(total)}</span>
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
