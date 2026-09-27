import Link from 'next/link';
import { createWhatsAppInquiryLink } from '@/lib/whatsapp-link';

const instagramUrl =
  process.env.NEXT_PUBLIC_INSTAGRAM_URL ||
  'https://www.instagram.com/kartik_sagar_322/';

export function Footer() {
  const whatsappLink = createWhatsAppInquiryLink();

  return (
    <footer className="site-footer">
      <div className="max-w-6xl mx-auto">
        <p className="footer-company">
          Pandurang Milk Product
        </p>

        <p className="footer-address">
          Fresh milk and dairy products across Latur District, Maharashtra.
        </p>

        <p className="footer-owner">
          Fresh. Pure. Trusted.
        </p>

        <div className="footer-contact">
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
          {' · '}
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram
          </a>
        </div>

        <nav className="footer-links" aria-label="Footer navigation">
          <Link href="/">Home</Link>
          <Link href="/products">Products</Link>
          <Link href="/contact">Contact Us</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>

        <p className="mt-5 text-xs text-white/50">
          © {new Date().getFullYear()} Pandurang Milk Product. All rights reserved.
        </p>
      </div>
    </footer>
  );
}