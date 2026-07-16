import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { Market } from '@velora/design-system';
import { getProduct } from '@/lib/catalog';
import { ProductFlow } from '@/components/ProductFlow';

/**
 * Page produit — point d'entrée réel du parcours.
 *
 * Le visiteur arrive ici directement depuis une pub Meta ou TikTok : il n'y a
 * pas de page d'accueil dans son parcours. C'est la page qui doit convertir.
 */

const MARKET_DELIVERY: Record<Market, string> = {
  bj: '24–48 h',
  ci: '48–72 h',
  ga: '3–5 j',
};

const ENABLED_MARKETS: Market[] = ['bj'];

interface PageProps {
  params: Promise<{ market: string; slug: string }>;
}

function parseMarket(value: string): Market | null {
  return (ENABLED_MARKETS as string[]).includes(value) ? (value as Market) : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { market, slug } = await params;
  const product = getProduct(slug);
  if (!product || !parseMarket(market)) return { title: 'Velora' };

  return {
    title: `${product.name} — Velora`,
    description: `${product.name}. Livré en ${MARKET_DELIVERY[parseMarket(market)!]}, vous payez le livreur en espèces.`,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { market: rawMarket, slug } = await params;

  const market = parseMarket(rawMarket);
  const product = getProduct(slug);
  if (!market || !product) notFound();

  return (
    <ProductFlow product={product} market={market} deliveryEstimate={MARKET_DELIVERY[market]} />
  );
}
