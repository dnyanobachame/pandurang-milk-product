import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/Header';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { WhatsAppFloatingButton } from '@/components/WhatsAppFloatingButton';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pandurang-milk-product.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Pandurang Milk Product — Fresh Dairy Products & Home Delivery in Latur District',
  description:
    'Farm-to-doorstep milk, curd, paneer, ghee and dairy products delivered fresh every morning across Latur District, Maharashtra. Farmer-first, household-trusted.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Pandurang Milk Product',
    description:
      'Fresh dairy products and home delivery across Latur District, Maharashtra.',
    url: SITE_URL,
    siteName: 'Pandurang Milk Product',
    locale: 'en_IN',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-cream-50 text-gray-900 antialiased">
        <Providers>
          <Header />
          <div className="pb-16 md:pb-0">{children}</div>
          <MobileBottomNav />
          <WhatsAppFloatingButton />
        </Providers>
      </body>
    </html>
  );
}
