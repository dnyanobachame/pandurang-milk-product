import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ProductOrderControls } from '@/components/ProductOrderControls';
import { ProductPrice } from '@/components/ProductPrice';
import { StockBadge } from '@/components/StockBadge';
import { formatProductUnit } from '@/lib/format-unit';
import { createPageMetadata } from '@/lib/seo';
import type { Product } from '@/lib/types';
import { JsonLd } from '@/components/JsonLd';

export const revalidate = 30;

export const metadata = createPageMetadata({
  title: 'Desi Ghee in Latur | Buy Ghee Online',
  description:
    'Buy desi ghee in Latur from Pandurang Milk Product. View available 500g and 1kg ghee packs, prices and availability, and order online or through WhatsApp.',
  path: '/ghee',
  keywords: [
    'ghee in Latur',
    'desi ghee Latur',
    'fresh ghee Latur',
    'cow ghee Latur',
    'desi cow ghee Latur',
    'ghee 500g Latur',
    'ghee 1kg Latur',
    'buy ghee online Latur',
    'order ghee online Latur',
    'ghee delivery Latur',
    'fresh ghee delivery Latur',
    'Pandurang Milk Product',
  ],
});

const GHEE_IDS = [
  'd343d767-d30b-47f2-a1a0-f29689b3acb3',
  '81110cc7-309a-4bac-9492-923ccc151d54',
];

export default async function GheePage() {
  const supabase = createClient();

  const { data } = await supabase
    .from('products')
    .select(
      'id, name, name_marathi, category_id, sku, unit, net_quantity, selling_price, mrp, image_url, available_quantity, min_stock_level, delivery_available, is_active'
    )
    .in('id', GHEE_IDS)
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
        item: 'https://pandurangmilk.in/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Products',
        item: 'https://pandurangmilk.in/products',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Ghee',
        item: 'https://pandurangmilk.in/ghee',
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

            <span className="text-gray-900">Ghee</span>
          </nav>

          <div className="max-w-3xl">
            <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
              Desi Ghee
            </span>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Desi Ghee in Latur
            </h1>

            <p className="mt-4 text-base leading-7 text-gray-600 sm:text-lg">
              Shop desi ghee available in 500g and 1kg packs from
              Pandurang Milk Product. Check current price and availability,
              then order online or directly through WhatsApp.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Ghee Products
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
              Ghee is currently unavailable
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
            Shop fresh milk, paneer, curd and other dairy products from
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
              href="/paneer"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
            >
              Fresh Paneer
            </Link>

            <Link
              href="/curd"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
            >
              Fresh Curd
            </Link>

            <Link
              href="/dairy-products"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
            >
              Dairy Products
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}