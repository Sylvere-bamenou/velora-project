import type { Metadata, Viewport } from 'next';
import { Spectral, IBM_Plex_Sans } from 'next/font/google';
import '@velora/design-system/tokens.css';
import '@velora/design-system/base.css';
import './globals.css';

/**
 * Polices auto-hébergées par next/font plutôt que chargées depuis Google.
 *
 * Le guide impose des polices libres ; next/font les sert depuis notre propre
 * domaine, ce qui supprime un aller-retour DNS + TLS vers fonts.gstatic.com.
 * Sur une 3G irrégulière, c'est la différence entre un titre qui s'affiche et
 * un écran vide.
 */
const spectral = Spectral({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-serif',
  display: 'swap',
});

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Velora — Mode masculine premium',
  description:
    'Montres et maroquinerie premium. Livré chez vous en 24–48 h, vous payez le livreur en espèces.',
};

export const viewport: Viewport = {
  themeColor: '#F5F1E8',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${spectral.variable} ${plexSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
