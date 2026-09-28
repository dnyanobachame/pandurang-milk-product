import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import { createClient } from '@/lib/supabase/server';
import { ProductOrderControls } from '@/components/ProductOrderControls';
import { ProductPrice } from '@/components/ProductPrice';
import { StockBadge } from '@/components/StockBadge';
import { formatProductUnit } from '@/lib/format-unit';
import { JsonLd } from '@/components/JsonLd';

const MILK_CATEGORY_ID =
  'ef583b79-ad1b-44bb-ac3b-67225b3daee7';

export const revalidate = 30;

export const metadata = createPageMetadata({
  title: 'Fresh Milk in Latur | Cow Milk & Buffalo Milk',
  description:
    'Buy fresh cow milk and buffalo milk in Latur from Pandurang Milk Product. View available 500 ml and 1 litre milk packs, prices and availability, and order online or through WhatsApp.',
  path: '/milk',
  keywords: [
    'milk in Latur',
    'fresh milk in Latur',
    'cow milk Latur',
    'fresh cow milk Latur',
    'desi cow milk Latur',
    'buffalo milk Latur',
    'fresh buffalo milk Latur',
    'cow milk 1 litre Latur',
    'buffalo milk 1 litre Latur',
    'buy milk online Latur',
    'order milk online Latur',
    'milk delivery Latur',
    'fresh milk delivery Latur',
    'Pandurang Milk Product',
  ],
});

type MilkProduct = {
  id: string;
  name: string;
  name_marathi: string | null;
  category_id: string | null;
  sku: string;
  unit: string;
  net_quantity: number | null;
  selling_price: number;
  mrp: number | null;
  image_url: string | null;
  available_quantity: number;
  min_stock_level?: number;
  delivery_available: boolean;
  is_active: boolean;
  product_categories?: {
    name: string;
    name_marathi: string | null;
  } | null;
};

export default async function MilkPage() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('products')
    .select(
      `
      id,
      name,
      name_marathi,
      category_id,
      sku,
      unit,
      net_quantity,
      selling_price,
      mrp,
      image_url,
      available_quantity,
      min_stock_level,
      delivery_available,
      is_active,
      product_categories (
        name,
        name_marathi
      )
    `
    )
    .eq('is_active', true)
    .eq('category_id', MILK_CATEGORY_ID)
    .order('name');

  const products = (data ?? []) as unknown as MilkProduct[];

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
        name: 'Milk',
        item: 'https://pandurangmilk.in/milk',
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />

      <main className="min-h-screen bg-cream-50">
        {/* Main container */}
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">

          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="mb-6"
          >
            <ol className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <li>
                <Link
                  href="/"
                  className="transition-colors hover:text-brand-700"
                >
                  Home
                </Link>
              </li>

              <li aria-hidden="true" className="text-gray-400">
                /
              </li>

              <li
                aria-current="page"
                className="font-medium text-gray-800"
              >
                Milk
              </li>
            </ol>
          </nav>

          {/* Hero */}
          <section className="mb-8 overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
            <div className="px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
              <div className="max-w-3xl">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-700">
                  Pandurang Milk Product
                </p>

                <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
                  Fresh Milk in Latur
                </h1>

                <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
                  Buy fresh cow milk and buffalo milk from Pandurang Milk
                  Product. Choose from available 500 ml and 1 litre packs,
                  check today's price and availability, and order online or
                  through WhatsApp.
                </p>

                {/* Hero actions */}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    href="/products"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                  >
                    View All Products
                  </Link>

                  <Link
                    href="/cow-milk"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-brand-200 bg-white px-5 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                  >
                    Cow Milk
                  </Link>

                  <Link
                    href="/buffalo-milk"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-brand-200 bg-white px-5 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                  >
                    Buffalo Milk
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Product section header */}
          <section>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                  Available Fresh Milk Products
                </h2>

                <p className="mt-1 text-sm text-gray-600 sm:text-base">
                  Current milk products, pack sizes and prices available online.
                </p>
              </div>

              <Link
                href="/products"
                className="inline-flex w-fit items-center text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                All Products
                <span className="ml-1" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>

            {/* Product grid */}
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                Unable to load milk products right now. Please try again later.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <MilkProductCard
                    key={product.id}
                    product={product}
                  />
                ))}
              </div>
            )}

            {products.length === 0 && !error && (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
                <p className="font-medium text-gray-800">
                  No milk products are currently available.
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Please check again later or contact us on WhatsApp.
                </p>
              </div>
            )}
          </section>

          {/* SEO / information section */}
          <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="max-w-4xl">
              <h2 className="text-2xl font-bold text-gray-900">
                Fresh Cow Milk and Buffalo Milk Available in Latur
              </h2>

              <div className="mt-4 space-y-4 text-sm leading-7 text-gray-600 sm:text-base">
                <p>
                  Pandurang Milk Product provides fresh milk and dairy products
                  for customers in selected areas of Latur District,
                  Maharashtra.
                </p>

                <p>
                  Browse our available cow milk and buffalo milk products,
                  compare pack sizes and prices, check availability and place
                  your order online.
                </p>

                <p>
                  You can also contact us through WhatsApp for product
                  information, availability and delivery-related questions.
                </p>
              </div>

              {/* Related pages */}
              <div className="mt-7 border-t border-gray-100 pt-6">
                <h3 className="text-base font-semibold text-gray-900">
                  Explore Our Dairy Products
                </h3>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  <RelatedLink
                    href="/cow-milk"
                    label="Cow Milk"
                  />

                  <RelatedLink
                    href="/buffalo-milk"
                    label="Buffalo Milk"
                  />

                  <RelatedLink
                    href="/paneer"
                    label="Paneer"
                  />

                  <RelatedLink
                    href="/curd"
                    label="Curd"
                  />

                  <RelatedLink
                    href="/ghee"
                    label="Ghee"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Bottom WhatsApp CTA */}
          <section className="mt-8 rounded-2xl bg-brand-700 px-5 py-7 text-white sm:px-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold sm:text-2xl">
                  Need help with your milk order?
                </h2>

                <p className="mt-1 text-sm leading-6 text-brand-50 sm:text-base">
                  Contact Pandurang Milk Product on WhatsApp for product
                  information, availability and ordering.
                </p>
              </div>

              <a
                href="https://wa.me/917028591828?text=Hello%20Pandurang%20Milk%20Product%0A%0AI%20need%20information%20about%20your%20milk%20products%2C%20prices%20and%20delivery.%0A%0APlease%20help%20me."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-bold text-brand-700 transition hover:bg-brand-50"
              >
                Chat on WhatsApp
              </a>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Product Card                                                               */
/* -------------------------------------------------------------------------- */

function MilkProductCard({
  product,
}: {
  product: MilkProduct;
}) {
  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">

      {/* Product image */}
      <Link
        href={`/products/${product.id}`}
        className="group block"
        aria-label={`View ${product.name}`}
      >
        <div className="relative aspect-square w-full overflow-hidden bg-cream-100">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={`${product.name} - Pandurang Milk Product`}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
              No image available
            </div>
          )}

          {/* Availability badge */}
          <div className="absolute left-3 top-3">
            <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-green-700 shadow-sm backdrop-blur">
              {product.available_quantity > 0
                ? 'Available Today'
                : 'Out of Stock'}
            </span>
          </div>
        </div>
      </Link>

      {/* Product content */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">

        {/* Name */}
        <div className="min-w-0">
          <Link
            href={`/products/${product.id}`}
            className="group"
          >
            <h3 className="line-clamp-2 min-h-[3rem] text-base font-semibold leading-6 text-gray-900 transition-colors group-hover:text-brand-700">
              {product.name}
            </h3>

            {product.name_marathi && (
              <p className="mt-1 min-h-[1.25rem] break-words text-sm leading-5 text-gray-500">
                {product.name_marathi}
              </p>
            )}
          </Link>
        </div>

        {/* Price */}
        <div className="mt-4 flex min-h-[2.75rem] items-center gap-2">
          <ProductPrice
            price={product.selling_price}
            mrp={product.mrp}
            size="md"
          />

          <span className="text-xs font-medium text-gray-500">
            / {formatProductUnit(product.unit, product.net_quantity)}
          </span>
        </div>

        {/* Stock */}
        <div className="mt-3">
          <StockBadge
            availableQuantity={product.available_quantity}
            lowStockThreshold={product.min_stock_level}
          />
        </div>

        {/* Actions pushed to bottom */}
        <div className="mt-auto pt-4">
          <ProductOrderControls product={product} />
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Related Link                                                               */
/* -------------------------------------------------------------------------- */

function RelatedLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center text-sm font-medium text-gray-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
    >
      {label}
    </Link>
  );
}