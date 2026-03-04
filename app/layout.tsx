import type { Metadata } from 'next';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import PublicContextMenuGuard from '@/components/PublicContextMenuGuard';
import { Raleway, Cormorant_Garamond } from 'next/font/google';
import './globals.css';

const sans = Raleway({ subsets: ['latin', 'cyrillic'], variable: '--font-sans' });
const serif = Cormorant_Garamond({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: 'Портфолио фотографа',
  description: 'Премиальный сайт-портфолио профессионального фотографа',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico'],
  },
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${sans.variable} ${serif.variable}`}>
      <body className="font-sans">
        <PublicContextMenuGuard />
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
