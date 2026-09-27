import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { AddToCartButton } from '@/components/AddToCartButton';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.example';

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

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const product = await getProduct(params.id);

  if (!product) {
    return {
      title: 'Product not found | Mauli Milk and Products',
    };
  }

  return {
    title: `${product.name} | Mauli Milk and Products`,
    description:
      product.description ||
      `${product.name} — fresh from Mauli Milk and Products, delivered across Latur District.`,
    openGraph: {
      title: product.name,
      description: product.description ?? undefined,
      images: product.image_url ? [product.image_url] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await getProduct(params.id);

  if (!product) notFound();

  const inStock =
    product.is_active &&
    product.delivery_available &&
    product.available_quantity > 0;

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
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      {/* Back */}
      <Link
        href="/products"
        className="inline-flex items-center text-sm text-gray-500 hover:text-brand-700 transition"
      >
        ← Back to Products
      </Link>

      <div className="grid md:grid-cols-2 gap-6 md:gap-10 mt-5 sm:mt-6">
        {/* Product image */}
        <div className="relative aspect-square rounded-2xl bg-cream-100 overflow-hidden border border-gray-100 shadow-sm">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-5xl mb-3">🥛</div>
                <p className="text-sm">Product image unavailable</p>
              </div>
            </div>
          )}
        </div>

        {/* Product information */}
        <div>
          {/* Category */}
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            {(product as any).product_categories?.name || 'Milk & Dairy'}
          </p>

          {/* Name */}
          <h1 className="text-2xl sm:text-3xl font-semibold mt-1 text-gray-900">
            {product.name}
          </h1>

          {product.name_marathi && (
            <p className="mt-1 text-gray-500">
              {product.name_marathi}
            </p>
          )}

          {/* Price */}
          <div className="mt-4 flex flex-wrap items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-semibold text-brand-700">
              ₹{product.selling_price}
            </span>

            {product.mrp && product.mrp > product.selling_price && (
              <span className="text-gray-400 line-through">
                ₹{product.mrp}
              </span>
            )}

            <span className="text-sm text-gray-500">
              / {product.net_quantity}
              {product.unit}
            </span>
          </div>

          {/* Availability */}
          <div
            className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
              inStock
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-600'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                inStock ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            {inStock ? 'Available for delivery' : 'Currently unavailable'}
          </div>

          {/* Description */}
          {product.description && (
            <div className="mt-5">
              <h2 className="font-semibold text-gray-900">
                Product Details
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                {product.description}
              </p>
            </div>
          )}

          {/* Product information */}
          <dl className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3 text-sm">
            {product.shelf_life_days && (
              <Row
                label="Shelf life"
                value={`${product.shelf_life_days} day(s)`}
              />
            )}

            {product.storage_requirements && (
              <Row
                label="Storage"
                value={product.storage_requirements}
              />
            )}

            <Row label="SKU" value={product.sku} />

            <Row
              label="Delivery"
              value={
                product.delivery_available
                  ? 'Available for delivery'
                  : 'Not available'
              }
            />

            <Row
              label="Available quantity"
              value={`${product.available_quantity} ${product.unit}`}
            />
          </dl>

          {/* Cart + WhatsApp */}
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
            ) : (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-center">
                <p className="text-sm text-gray-500">
                  This product is currently unavailable.
                </p>

                <Link
                  href="/products"
                  className="inline-block mt-3 text-sm font-medium text-brand-700 hover:text-brand-800"
                >
                  Browse other products →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-800 text-right">
        {value}
      </dd>
    </div>
  );
}