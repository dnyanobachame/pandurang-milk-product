import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ContactFloat } from '@/components/ContactFloat';

export const metadata: Metadata = {
  title: 'Pandurang Milk Product | Fresh. Pure. Trusted.',
  description:
    'Farm-to-doorstep milk and dairy products delivered across Latur District, Maharashtra.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-cream-50 text-gray-900 antialiased">
        <Providers>
          <Header />
          {children}
          <Footer />
          <ContactFloat />
        </Providers>
      </body>
    </html>
  );
}