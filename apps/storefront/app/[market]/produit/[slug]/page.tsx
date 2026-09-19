import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProduct, allProducts } from '@/lib/catalog';
import { ENABLED_MARKETS, MARKET_DELIVERY, parseMarket } from '@/lib/markets';
import { ProductDetail } from '@/components/ProductDetail';

/**
 * Page produit — point d'entrée réel du parcours.
 *
 * Le visiteur arrive ici directement depuis une pub Meta ou TikTok : il n'y a
 * pas de page d'accueil dans son parcours. C'est la page qui doit convertir.
 */
interface PageProps {
  params: Promise<{ market: string; slug: string }>;
}

export function generateStaticParams() {
  return ENABLED_MARKETS.flatMap((market) =>
    allProducts().map((p) => ({ market, slug: p.slug })),
  );
}

/** Titre d'onglet : on tronque le nom marketing pour le SEO et l'affichage. */
function shortTitle(name: string): string {
  const clean = name.split(/[–—]/)[0]!.trim();
  return clean.length > 60 ? `${clean.slice(0, 57)}…` : clean;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { market, slug } = await params;
  const product = getProduct(slug);
  const m = parseMarket(market);
  if (!product || !m) return { title: 'Velora' };

  return {
    title: `${shortTitle(product.title)} — Velora`,
    description: `Livré en ${MARKET_DELIVERY[m]}, vous payez le livreur en espèces.`,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { market: rawMarket, slug } = await params;
  const market = parseMarket(rawMarket);
  const product = getProduct(slug);
  if (!market || !product) notFound();

  return <ProductDetail product={product} market={market} />;
}
