import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { parseMarket } from '@/lib/markets';
import { CartView } from '@/components/CartView';

export const metadata: Metadata = { title: 'Panier — Velora' };

export default async function CartPage({ params }: { params: Promise<{ market: string }> }) {
  const { market: raw } = await params;
  const market = parseMarket(raw);
  if (!market) notFound();

  return <CartView market={market} />;
}
