import type { Metadata } from 'next';
import { Spectral, IBM_Plex_Sans } from 'next/font/google';
import '@velora/design-system/tokens.css';
import '@velora/design-system/base.css';
import './globals.css';

const spectral = Spectral({
  subsets: ['latin'],
  weight: ['400', '500'],
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
  title: 'Velora · Dashboard',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${spectral.variable} ${plexSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
