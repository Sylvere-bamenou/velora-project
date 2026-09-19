import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MARKET_DELIVERY, parseMarket } from '@/lib/markets';
import { Checkout } from '@/components/Checkout';

export const metadata: Metadata = { title: 'Commande — Velora' };

export default async function CheckoutPage({ params }: { params: Promise<{ market: string }> }) {
  const { market: raw } = await params;
  const market = parseMarket(raw);
  if (!market) notFound();

  return <Checkout market={market} deliveryEstimate={MARKET_DELIVERY[market]} />;
}
