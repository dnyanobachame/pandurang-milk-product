import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ProductOrderControls } from '@/components/ProductOrderControls';
import { ProductPrice } from '@/components/ProductPrice';
import { StockBadge } from '@/components/StockBadge';
import { formatProductUnit } from '@/lib/format-unit';
import type { Product, ProductCategory } from '@/lib/types';
import { createPageMetadata } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';

export const revalidate = 30;

export const metadata = createPageMetadata({
  title: 'Fresh Milk & Dairy Products in Latur | Pandurang Milk Product',
  description:
    'Shop fresh milk, cow milk, buffalo milk, paneer, curd, ghee and other dairy products from Pandurang Milk Product. Check prices, availability and order online in selected areas of Latur District.',
  path: '/products',
  keywords: [
    'milk products in Latur',
    'dairy products in Latur',
    'fresh dairy products Latur',
    'fresh milk Latur',
    'cow milk Latur',
    'buffalo milk Latur',
    'paneer Latur',
    'curd Latur',
    'ghee Latur',
    'buy milk online Latur',
    'buy dairy products online Latur',
    'Pandurang Milk Product',
  ],
});

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const supabase = createClient();

  const [{ data: categories }, { data: products }] =
    await Promise.all([
      supabase
        .from('product_categories')
        .select('id, name, name_marathi')
        .order('sort_order'),

      supabase
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
          is_active
        `
        )
        .eq('is_active', true)
        .order('name'),
    ]);

  const categoryList =
    (categories as ProductCategory[] | null) ?? [];

  const productList =
    (products as Product[] | null) ?? [];

  const activeCategory = searchParams.category;

  const filteredProducts = activeCategory
    ? productList.filter(
        (product) =>
          product.category_id === activeCategory
      )
    : productList;

  const activeCategoryName = activeCategory
    ? categoryList.find(
        (category) => category.id === activeCategory
      )
    : null;

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
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />

      <main className="min-h-screen bg-cream-50">
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

              <li
                aria-hidden="true"
                className="text-gray-400"
              >
                /
              </li>

              <li
                aria-current="page"
                className="font-medium text-gray-800"
              >
                Products
              </li>
            </ol>
          </nav>

          {/* Header */}
          <section className="mb-7 overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
            <div className="px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

                <div className="max-w-3xl">
                  <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-700">
                    Pandurang Milk Product
                  </p>

                  <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl">
                    Fresh Milk & Dairy Products
                  </h1>

                  <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
                    Explore fresh milk, cow milk, buffalo milk, paneer,
                    curd, ghee and other dairy products available from
                    Pandurang Milk Product in selected areas of Latur District.
                  </p>
                </div>

                {/* Cart */}
                <Link
                  href="/cart"
                  className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 sm:w-auto"
                >
                  View Cart
                  <span className="ml-1" aria-hidden="true">
                    →
                  </span>
                </Link>
              </div>
            </div>
          </section>

          {/* Category filter */}
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Browse Categories
                </h2>

                {activeCategoryName && (
                  <p className="mt-0.5 text-sm text-gray-500">
                    Showing{' '}
                    <span className="font-medium text-gray-700">
                      {activeCategoryName.name}
                    </span>
                  </p>
                )}
              </div>

              <span className="shrink-0 text-sm text-gray-500">
                {filteredProducts.length}{' '}
                {filteredProducts.length === 1
                  ? 'product'
                  : 'products'}
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              <CategoryPill
                href="/products"
                label="All"
                active={!activeCategory}
              />

              {categoryList.map((category) => (
                <CategoryPill
                  key={category.id}
                  href={`/products?category=${category.id}`}
                  label={category.name}
                  marathi={category.name_marathi}
                  active={activeCategory === category.id}
                />
              ))}
            </div>
          </section>

          {/* Products */}
          <section>
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                  />
                ))}
              </div>
            ) : (
              <EmptyProductsState />
            )}
          </section>

          {/* Helpful category links */}
          <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="max-w-4xl">
              <h2 className="text-2xl font-bold text-gray-900">
                Explore Our Dairy Products
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-600 sm:text-base">
                Find fresh milk and dairy products available from
                Pandurang Milk Product.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <RelatedLink
                  href="/milk"
                  label="Milk"
                />

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

                <RelatedLink
                  href="/dairy-products"
                  label="Dairy Products"
                />
              </div>
            </div>
          </section>

          {/* WhatsApp CTA */}
          <section className="mt-8 rounded-2xl bg-brand-700 px-5 py-7 text-white sm:px-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold sm:text-2xl">
                  Need help choosing a product?
                </h2>

                <p className="mt-1 text-sm leading-6 text-brand-50 sm:text-base">
                  Contact Pandurang Milk Product on WhatsApp for
                  product information, availability and ordering.
                </p>
              </div>

              <a
                href="https://wa.me/917028591828?text=Hello%20Pandurang%20Milk%20Product%0A%0AI%20need%20information%20about%20your%20milk%20and%20dairy%20products.%0A%0APlease%20help%20me."
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

function ProductCard({
  product,
}: {
  product: Product;
}) {
  const outOfStock =
    !product.delivery_available ||
    product.available_quantity <= 0;

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">

      {/* Image */}
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

          {/* Availability */}
          <div className="absolute left-3 top-3">
            <span
              className={
                outOfStock
                  ? 'rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-red-600 shadow-sm backdrop-blur'
                  : 'rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-green-700 shadow-sm backdrop-blur'
              }
            >
              {outOfStock
                ? 'Currently unavailable'
                : 'Available Today'}
            </span>
          </div>
        </div>
      </Link>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">

        {/* Product name */}
        <div className="min-w-0">
          <Link
            href={`/products/${product.id}`}
            className="group"
          >
            <h2 className="line-clamp-2 min-h-[3rem] text-base font-semibold leading-6 text-gray-900 transition-colors group-hover:text-brand-700">
              {product.name}
            </h2>

            {product.name_marathi && (
              <p className="mt-1 min-h-[1.25rem] break-words text-sm leading-5 text-gray-500">
                {product.name_marathi}
              </p>
            )}
          </Link>
        </div>

        {/* Price */}
        <div className="mt-4 flex min-h-[2.75rem] flex-wrap items-center gap-2">
          <ProductPrice
            price={product.selling_price}
            mrp={product.mrp}
            size="md"
          />

          <span className="text-xs font-medium text-gray-500">
            / {formatProductUnit(
              product.unit,
              product.net_quantity
            )}
          </span>
        </div>

        {/* Stock */}
        <div className="mt-3">
          <StockBadge
            availableQuantity={
              product.available_quantity
            }
            lowStockThreshold={
              product.min_stock_level
            }
          />
        </div>

        {/* Actions */}
        <div className="mt-auto pt-4">
          <ProductOrderControls
            product={product}
          />
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Category Pill                                                              */
/* -------------------------------------------------------------------------- */

function CategoryPill({
  href,
  label,
  marathi,
  active,
}: {
  href: string;
  label: string;
  marathi?: string | null;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        'flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition',
        active
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-gray-200 bg-white text-gray-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700',
      ].join(' ')}
    >
      <span>{label}</span>

      {marathi && (
        <span
          className={
            active
              ? 'text-xs text-white/80'
              : 'text-xs text-gray-400'
          }
        >
          {marathi}
        </span>
      )}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Related Links                                                              */
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

/* -------------------------------------------------------------------------- */
/* Empty State                                                                */
/* -------------------------------------------------------------------------- */

function EmptyProductsState() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cream-100 text-2xl">
        🥛
      </div>

      <h2 className="mt-4 text-lg font-bold text-gray-900">
        No products in this category yet
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
        Please choose another category or browse all available
        products.
      </p>

      <Link
        href="/products"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        View All Products
      </Link>
    </div>
  );
}