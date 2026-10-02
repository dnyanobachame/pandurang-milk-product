import Link from 'next/link';
import { createWhatsAppInquiryLink } from '@/lib/whatsapp-link';

const instagramUrl =
  process.env.NEXT_PUBLIC_INSTAGRAM_URL ||
  'https://www.instagram.com/kartik_sagar_322/';

export function Footer() {
  const whatsappLink = createWhatsAppInquiryLink();

  return (
    <footer className="site-footer">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="footer-company">
              Pandurang Milk Product
            </p>

            <p className="footer-address">
              Fresh milk and dairy products across Latur
              District, Maharashtra.
            </p>

            <p className="footer-owner">
              Fresh. Pure. Trusted.
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-white">
              Quick Links
            </p>

            <nav
              className="footer-links flex flex-wrap gap-x-4 gap-y-2"
              aria-label="Footer navigation"
            >
              <Link href="/">Home</Link>
              <Link href="/products">Products</Link>
              <Link href="/contact">Contact Us</Link>
              <Link href="/privacy">Privacy</Link>
            </nav>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-white">
              Connect With Us
            </p>

            <div className="footer-contact flex flex-wrap items-center gap-x-2 gap-y-2">
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Contact Pandurang Milk Product on WhatsApp"
                >
                  WhatsApp
                </a>
              )}

              {whatsappLink && (
                <span aria-hidden="true">·</span>
              )}

              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow Pandurang Milk Product on Instagram"
              >
                Instagram
              </a>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} Pandurang Milk Product.
            All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}