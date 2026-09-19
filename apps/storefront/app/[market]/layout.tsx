import { notFound } from 'next/navigation';
import { CartProvider } from '@/components/CartProvider';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ENABLED_MARKETS, parseMarket } from '@/lib/markets';

export function generateStaticParams() {
  return ENABLED_MARKETS.map((market) => ({ market }));
}

export default async function MarketLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ market: string }>;
}) {
  const { market: raw } = await params;
  const market = parseMarket(raw);
  if (!market) notFound();

  return (
    <CartProvider market={market}>
      <Header market={market} />
      {children}
      <Footer market={market} />
    </CartProvider>
  );
}
