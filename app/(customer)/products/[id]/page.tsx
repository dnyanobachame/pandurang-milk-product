import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { AddToCartButton } from '@/components/AddToCartButton';
import { formatProductUnit } from '@/lib/format-unit';
import { ProductWhatsAppButton } from '@/components/ProductWhatsAppButton';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.example';

async function getProduct(id: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('products')
    .select(
      `id, name, name_marathi, sku, unit, net_quantity, selling_price, mrp, gst_percent,
       image_url, description, storage_requirements, shelf_life_days, available_quantity,
       delivery_available, is_active, product_categories(name)`
    )
    .eq('id', id)
    .single();
  return data;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const product = await getProduct(params.id);
  if (!product) return { title: 'Product not found | Mauli Milk and Products' };

  return {
    title: `${product.name} | Mauli Milk and Products`,
    description: product.description || `${product.name} — fresh from Mauli Milk and Products, delivered across Latur District.`,
    openGraph: {
      title: product.name,
      description: product.description ?? undefined,
      images: product.image_url ? [product.image_url] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  if (!product) notFound();

  const inStock = product.is_active && product.available_quantity > 0;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    image: product.image_url || undefined,
    sku: product.sku,
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/products/${product.id}`,
      priceCurrency: 'INR',
      price: product.selling_price,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/products" className="text-sm text-gray-500 hover:text-brand-700">← Back to Products</Link>

      <div className="grid md:grid-cols-2 gap-8 mt-4">
        <div className="aspect-square rounded-xl2 bg-cream-100 overflow-hidden">
          {product.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          )}
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            {(product as any).product_categories?.name}
          </p>
          <h1 className="text-2xl font-semibold mt-1">{product.name}</h1>
          {product.name_marathi && <p className="text-gray-500">{product.name_marathi}</p>}

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-brand-700">₹{product.selling_price}</span>
            {product.mrp && product.mrp > product.selling_price && (
              <span className="text-gray-400 line-through">₹{product.mrp}</span>
            )}
            <span className="text-gray-500">/ {formatProductUnit(product.unit, product.net_quantity)}</span>
          </div>

          <p className={`mt-2 text-sm font-medium ${inStock ? 'text-brand-700' : 'text-red-600'}`}>
            {inStock ? 'In stock' : 'Currently unavailable'}
          </p>

          {product.description && <p className="mt-4 text-gray-700">{product.description}</p>}

          <dl className="mt-6 space-y-2 text-sm">
            {product.shelf_life_days && (
              <Row label="Shelf life" value={`${product.shelf_life_days} day(s)`} />
            )}
            {product.storage_requirements && (
              <Row label="Storage" value={product.storage_requirements} />
            )}
            <Row label="SKU" value={product.sku} />
            <Row label="Delivery" value={product.delivery_available ? 'Available for delivery' : 'Not available for delivery'} />
          </dl>

          <div className="mt-6">
            {inStock ? (
              <AddToCartButton
                product={{
                  id: product.id,
                  name: product.name,
                  name_marathi: product.name_marathi,
                  category_id: null,
                  sku: product.sku,
                  unit: product.unit,
                  net_quantity: product.net_quantity,
                  selling_price: product.selling_price,
                  mrp: product.mrp,
                  image_url: product.image_url,
                  available_quantity: product.available_quantity,
                  delivery_available: product.delivery_available,
                  is_active: product.is_active,
                }}
              />
            ) : null}
            <ProductWhatsAppButton name={product.name} price={product.selling_price} />
            {!inStock && (
              <button disabled className="rounded-full bg-gray-100 text-gray-400 px-6 py-2 text-sm">
                Unavailable
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-50 pb-1">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
