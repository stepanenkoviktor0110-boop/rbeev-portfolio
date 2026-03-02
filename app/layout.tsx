import type { Metadata } from 'next';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import PublicContextMenuGuard from '@/components/PublicContextMenuGuard';
import { Raleway, Cormorant_Garamond } from 'next/font/google';
import './globals.css';

const sans = Raleway({ subsets: ['latin', 'cyrillic'], variable: '--font-sans' });
const serif = Cormorant_Garamond({ subsets: ['latin', 'cyrillic'], weight: ['300', '400', '500', '600', '700'], variable: '--font-serif' });

export const metadata: Metadata = {
  title: 'Портфолио фотографа',
  description: 'Премиальный сайт-портфолио профессионального фотографа',
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
