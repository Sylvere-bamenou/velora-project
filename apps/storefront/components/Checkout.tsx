'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  formatAmount,
  priceForMarket,
  COD_COPY,
  type Market,
} from '@velora/design-system';
import { useCart } from './CartProvider';
import form from './ProductFlow.module.css';
import styles from './Checkout.module.css';

interface FormState {
  name: string;
  phone: string;
  city: string;
  address: string;
}

const EMPTY: FormState = { name: '', phone: '', city: 'Cotonou', address: '' };

function validate(f: FormState) {
  return {
    name: !f.name.trim(),
    phone: f.phone.replace(/\D/g, '').length < 8,
    address: !f.address.trim(),
  };
}

export function Checkout({ market, deliveryEstimate }: { market: Market; deliveryEstimate: string }) {
  const { items, total, count, clear } = useCart();
  const [values, setValues] = useState<FormState>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [order, setOrder] = useState<{ ref: string; total: number; city: string; firstName: string; phone: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Panier vide et pas encore de commande confirmée : rien à régler.
  if (count === 0 && !order) {
    return (
      <div className={styles.wrap}>
        <p className={form.formIntro}>Votre panier est vide.</p>
        <Link href={`/${market}`} className={styles.cta} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
          Voir les produits
        </Link>
      </div>
    );
  }

  // ─── Confirmation ───
  if (order) {
    return (
      <div className={styles.wrap}>
        <div className={form.confirm}>
          <div className={form.check}>✓</div>
          <h1 className={form.confirmTitle}>{COD_COPY.confirmationTitle}</h1>
          <p className={form.confirmBody}>
            Merci {order.firstName}. <b>On vous appelle pour confirmer</b> sur le {order.phone}, puis
            le livreur passe.
          </p>
          <div className={form.receipt}>
            <div className={form.receiptRow}>
              <span className={form.receiptKey}>Commande</span>
              <span className={`${form.receiptVal} ${form.receiptMono}`}>{order.ref}</span>
            </div>
            <div className={form.receiptRow}>
              <span className={form.receiptKey}>Livraison</span>
              <span className={form.receiptVal}>
                {order.city} · {deliveryEstimate}
              </span>
            </div>
            <div className={form.receiptTotal}>
              <span className={form.receiptTotalKey}>À payer en espèces</span>
              <span className={form.receiptTotalVal}>{priceForMarket(order.total, market)}</span>
            </div>
          </div>
          <div className={form.confirmNote}>
            <span className={form.dot} />
            {COD_COPY.reassurance}
          </div>
          <div style={{ marginTop: 'var(--s-5)' }}>
            <Link href={`/${market}`} className={styles.cta} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Continuer mes achats
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const errors = validate(values);
  const show = touched ? errors : { name: false, phone: false, address: false };
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  function submit() {
    if (errors.name || errors.phone || errors.address) {
      setTouched(true);
      return;
    }
    setSubmitting(true);
    // @todo Brancher POST /v1/orders (API + Postgres) et récupérer l'event_id
    // pour le pixel. Pour l'instant la commande est confirmée côté client.
    const ref = `VLR-${market.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
    setOrder({
      ref,
      total,
      city: values.city,
      firstName: values.name.trim().split(/\s+/)[0] || '',
      phone: values.phone,
    });
    clear();
    setSubmitting(false);
  }

  return (
    <div className={styles.wrap}>
      <h1 className={form.title} style={{ marginBottom: 'var(--s-1)' }}>
        Vos coordonnées
      </h1>
      <p className={form.formIntro}>
        On vous appelle pour confirmer avant l&apos;envoi. Aucun paiement en ligne.
      </p>

      <ul className={styles.recapList}>
        {items.map((item) => (
          <li key={item.sku} className={styles.recapItem}>
            {item.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.recapImg} src={item.image} alt="" />
            )}
            <div className={styles.recapMain}>
              <div className={styles.recapName}>{item.name}</div>
              <div className={styles.recapMeta}>
                {item.optionLabel ? `${item.optionLabel} · ` : ''}Quantité {item.quantity}
              </div>
            </div>
            <div className={styles.recapPrice}>{formatAmount(item.unitPrice * item.quantity)} FCFA</div>
          </li>
        ))}
      </ul>

      <div className={form.fields}>
        <label className={form.field}>
          <span className={form.fieldLabel}>Nom complet</span>
          <input
            className={`${form.input} ${show.name ? form.inputError : ''}`}
            value={values.name}
            onChange={set('name')}
            placeholder="Ex. Kofi Mensah"
            autoComplete="name"
            aria-invalid={show.name}
            aria-describedby={show.name ? 'err-name' : undefined}
          />
          {show.name && (
            <span id="err-name" role="alert" className={form.errorText}>
              Indiquez votre nom.
            </span>
          )}
        </label>

        <label className={form.field}>
          <span className={form.fieldLabel}>Téléphone (WhatsApp de préférence)</span>
          <input
            className={`${form.input} ${show.phone ? form.inputError : ''}`}
            value={values.phone}
            onChange={set('phone')}
            inputMode="tel"
            autoComplete="tel"
            placeholder="+229 01 97 00 00 00"
            aria-invalid={show.phone}
            aria-describedby={show.phone ? 'err-phone' : undefined}
          />
          {show.phone && (
            <span id="err-phone" role="alert" className={form.errorText}>
              Numéro à 8 chiffres minimum.
            </span>
          )}
        </label>

        <label className={form.field}>
          <span className={form.fieldLabel}>Ville</span>
          <input
            className={form.input}
            value={values.city}
            onChange={set('city')}
            autoComplete="address-level2"
          />
        </label>

        <label className={form.field}>
          <span className={form.fieldLabel}>Adresse / repère de livraison</span>
          <input
            className={`${form.input} ${show.address ? form.inputError : ''}`}
            value={values.address}
            onChange={set('address')}
            placeholder="Quartier, repère proche…"
            autoComplete="street-address"
            aria-invalid={show.address}
            aria-describedby={show.address ? 'err-address' : undefined}
          />
          {show.address && (
            <span id="err-address" role="alert" className={form.errorText}>
              Indiquez un repère de livraison.
            </span>
          )}
        </label>
      </div>

      <div className={form.totalRow}>
        <span className={form.totalLabel}>À régler au livreur</span>
        <span className={form.totalValue}>{priceForMarket(total, market)}</span>
      </div>

      <div className={styles.ctaWrap}>
        <button className={styles.cta} onClick={submit} disabled={submitting}>
          Confirmer ma commande
        </button>
        <div className={styles.ctaNote}>
          Paiement en espèces à la réception · sans engagement en ligne
        </div>
      </div>
    </div>
  );
}
