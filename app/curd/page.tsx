import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ProductOrderControls } from '@/components/ProductOrderControls';
import { ProductPrice } from '@/components/ProductPrice';
import { StockBadge } from '@/components/StockBadge';
import { formatProductUnit } from '@/lib/format-unit';
import { absoluteUrl, createPageMetadata } from '@/lib/seo';
import type { Product } from '@/lib/types';
import { JsonLd } from '@/components/JsonLd';

export const revalidate = 30;

export const metadata = createPageMetadata({
  title: 'Fresh Curd in Latur | Buy Curd Online',
  description:
    'Buy fresh curd in Latur from Pandurang Milk Product. View available 250g, 500g and 1 litre curd packs, prices and availability, and order online or through WhatsApp.',
  path: '/curd',
  keywords: [
    'curd in Latur',
    'fresh curd Latur',
    'fresh dahi Latur',
    'dahi in Latur',
    'curd 250g Latur',
    'curd 500g Latur',
    'curd 1 litre Latur',
    'buy curd online Latur',
    'buy dahi online Latur',
    'order curd online Latur',
    'fresh curd delivery Latur',
    'Pandurang Milk Product',
  ],
});

const CURD_IDS = [
  '0d80b374-e203-448f-be29-6120f039eadc',
  '287bb2d3-6499-47ef-947c-fb7b67c612ca',
  '2115d862-465e-4acf-9631-84d6561f013c',
];

export default async function CurdPage() {
  const supabase = createClient();

  const { data } = await supabase
    .from('products')
    .select(
      'id, name, name_marathi, category_id, sku, unit, net_quantity, selling_price, mrp, image_url, available_quantity, min_stock_level, delivery_available, is_active'
    )
    .in('id', CURD_IDS)
    .eq('is_active', true);

  const products = (data ?? []) as Product[];

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: absoluteUrl('/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Products',
        item: absoluteUrl('/products'),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Curd',
        item: absoluteUrl('/curd'),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <JsonLd data={breadcrumbJsonLd} />

      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <nav className="mb-5 text-sm text-gray-500">
            <Link href="/" className="hover:text-brand-700">
              Home
            </Link>

            <span className="mx-2">/</span>

            <Link href="/products" className="hover:text-brand-700">
              Products
            </Link>

            <span className="mx-2">/</span>

            <span className="text-gray-900">Curd</span>
          </nav>

          <div className="max-w-3xl">
            <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
              Fresh Curd
            </span>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Fresh Curd in Latur
            </h1>

            <p className="mt-4 text-base leading-7 text-gray-600 sm:text-lg">
              Fresh dahi available in 250g, 500g and 1 litre packs.
              Check current availability and prices, then order online
              or directly through WhatsApp.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Fresh Curd Products
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {products.length} available product
              {products.length === 1 ? '' : 's'}
            </p>
          </div>

          <Link
            href="/products"
            className="text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            View all products →
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <article
                key={product.id}
                className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <Link
                  href={`/products/${product.id}`}
                  className="group block"
                >
                  <div className="aspect-square overflow-hidden bg-gray-100">
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={`${product.name} - Pandurang Milk Product`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-gray-400">
                        No image available
                      </div>
                    )}
                  </div>
                </Link>

                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <Link
                    href={`/products/${product.id}`}
                    className="group"
                  >
                    <h2 className="text-sm font-semibold text-gray-900 group-hover:text-brand-700">
                      {product.name}
                    </h2>

                    {product.name_marathi && (
                      <p className="mt-1 text-xs text-gray-500">
                        {product.name_marathi}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-baseline gap-2">
                      <ProductPrice
                        price={product.selling_price}
                        mrp={product.mrp}
                        size="md"
                      />

                      <span className="text-xs text-gray-500">
                        /{' '}
                        {formatProductUnit(
                          product.unit,
                          product.net_quantity
                        )}
                      </span>
                    </div>
                  </Link>

                  <div className="mt-3">
                    <StockBadge
                      availableQuantity={product.available_quantity}
                      lowStockThreshold={product.min_stock_level}
                    />
                  </div>

                  <div className="mt-auto pt-4">
                    <ProductOrderControls product={product} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Curd is currently unavailable
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Please check our other dairy products.
            </p>

            <Link
              href="/products"
              className="mt-5 inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              View All Products
            </Link>
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-brand-100 bg-brand-50 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Explore more dairy products
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Shop fresh milk, paneer, ghee and other dairy products from
            Pandurang Milk Product.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/milk"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
            >
              Fresh Milk
            </Link>

            <Link
              href="/cow-milk"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
            >
              Cow Milk
            </Link>

            <Link
              href="/paneer"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
            >
              Fresh Paneer
            </Link>

            <Link
              href="/ghee"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
            >
              Desi Ghee
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}