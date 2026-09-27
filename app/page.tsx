import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatProductUnit } from '@/lib/format-unit';
import { AddToCartButton } from '@/components/AddToCartButton';
import { ProductWhatsAppButton } from '@/components/ProductWhatsAppButton';
import { StockBadge } from '@/components/StockBadge';

export const revalidate = 60; // ISR: refresh product list every minute

export default async function HomePage() {
  const supabase = createClient();

  const [{ data: settings }, { data: products }] = await Promise.all([
    supabase.from('company_settings').select('*').single(),
    supabase
      .from('products')
      .select(
        'id, name, name_marathi, category_id, sku, unit, net_quantity, selling_price, mrp, image_url, available_quantity, min_stock_level, delivery_available, is_active'
      )
      .eq('is_active', true)
      .limit(6),
  ]);

  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <p className="kicker">Farm to Doorstep</p>
          <h1 className="hero-title">
            {settings?.company_name ?? 'Pandurang Milk Product'}
          </h1>
          <p className="hero-tagline">
            {settings?.tagline ?? 'Fresh. Pure. Trusted.'}
          </p>
          <p className="hero-address">
            Delivering across {settings?.address ?? 'Latur District, Maharashtra'}
          </p>
          <Link href="/products" className="cta-btn">
            Order Now
          </Link>
        </div>
        <div className="hero-wave" />
      </section>

      {/* Stats strip */}
      <section className="stats-strip">
        <div className="stats-grid">
          <div className="stat">
            <p className="stat-num">100%</p>
            <p className="stat-label">Farm Fresh Milk</p>
          </div>
          <div className="stat">
            <p className="stat-num">Daily</p>
            <p className="stat-label">Doorstep Delivery</p>
          </div>
          <div className="stat">
            <p className="stat-num">Batch</p>
            <p className="stat-label">Traced Quality</p>
          </div>
          <div className="stat">
            <p className="stat-num">Local</p>
            <p className="stat-label">Farmers, Local Homes</p>
          </div>
        </div>
      </section>

      {/* Today's products */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Today&apos;s Products</h2>
          <div className="section-divider" />
        </div>
        <div className="product-grid">
          {(products ?? []).map((p) => (
            <div key={p.id} className="product-card">
              <div className="product-image overflow-hidden">
                <span className="badge-fresh">Fresh</span>
                {p.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                )}
              </div>
              <h3 className="product-name">{p.name}</h3>
              {p.name_marathi && (
                <p className="product-name-mr">{p.name_marathi}</p>
              )}
              <p className="product-price">
                ₹{p.selling_price}{' '}
                <span className="product-unit">/ {formatProductUnit(p.unit, p.net_quantity)}</span>
              </p>
              <StockBadge
                availableQuantity={p.available_quantity}
                lowStockThreshold={p.min_stock_level}
              />
              <AddToCartButton product={p} />
              <ProductWhatsAppButton name={p.name} price={p.selling_price} />
            </div>
          ))}
          {(!products || products.length === 0) && (
            <p className="empty-note">
              Products will appear here once Admin publishes the catalog.
            </p>
          )}
        </div>
      </section>

      {/* Why choose us */}
      <section className="section section-alt">
        <div className="section-header">
          <h2 className="section-title">Why Choose Us</h2>
          <div className="section-divider" />
        </div>
        <div className="why-grid">
          <div className="why-card why-red">
            <h3 className="why-title">Batch-Traced Quality</h3>
            <p className="why-text">
              Every product is tracked from milk collection through delivery,
              with quality checks at each stage.
            </p>
          </div>
          <div className="why-card why-blue">
            <h3 className="why-title">Local &amp; Reliable</h3>
            <p className="why-text">
              Serving households across Latur District with daily and
              subscription delivery options.
            </p>
          </div>
          <div className="why-card why-yellow">
            <h3 className="why-title">Transparent Ordering</h3>
            <p className="why-text">
              Track your order from confirmation to doorstep, with clear
              payment verification at every step.
            </p>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <p className="footer-company">
          {settings?.company_name ?? 'Pandurang Milk Product'}
        </p>
        <p className="footer-address">
          {settings?.address ?? 'Village Aanandwadi (Gaur)'}
        </p>
        <p className="footer-owner">Owner: Kartik Dattatray Sagar</p>
        <p className="footer-contact">
          <a href="tel:7028591828">7028591828</a> ・{' '}
          <a href="tel:9921032936">9921032936</a> ・{' '}
          <a href="mailto:milkpandurang@gmail.com">milkpandurang@gmail.com</a>
        </p>
        <div className="footer-links">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/refund-policy">Refunds</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </footer>
    </main>
  );
}
