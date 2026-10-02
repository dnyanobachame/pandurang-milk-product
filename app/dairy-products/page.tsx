import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ProductOrderControls } from '@/components/ProductOrderControls';
import { ProductPrice } from '@/components/ProductPrice';
import { StockBadge } from '@/components/StockBadge';
import { formatProductUnit } from '@/lib/format-unit';
import { absoluteUrl, createPageMetadata } from '@/lib/seo';
import type { Product, ProductCategory } from '@/lib/types';
import { JsonLd } from '@/components/JsonLd';

export const revalidate = 30;

export const metadata = createPageMetadata({
  title: 'Dairy Products in Latur | Fresh Milk, Paneer, Curd & Ghee',
  description:
    'Shop fresh dairy products in Latur from Pandurang Milk Product. Buy milk, paneer, curd, ghee and other dairy products with online and WhatsApp ordering.',
  path: '/dairy-products',
  keywords: [
    'dairy products in Latur',
    'fresh dairy products Latur',
    'dairy products near me',
    'milk products Latur',
    'fresh milk Latur',
    'paneer Latur',
    'curd Latur',
    'ghee Latur',
    'buy dairy products online Latur',
    'order dairy products Latur',
    'dairy delivery Latur',
    'Pandurang Milk Product',
  ],
});

export default async function DairyProductsPage() {
  const supabase = createClient();

  const [{ data: productsData }, { data: categoriesData }] =
    await Promise.all([
      supabase
        .from('products')
        .select(
          'id, name, name_marathi, category_id, sku, unit, net_quantity, selling_price, mrp, image_url, available_quantity, min_stock_level, delivery_available, is_active'
        )
        .eq('is_active', true)
        .order('name'),

      supabase
        .from('product_categories')
        .select('id, name, name_marathi')
        .order('sort_order'),
    ]);

  const products = (productsData ?? []) as Product[];
  const categories = (categoriesData ?? []) as ProductCategory[];

  const categoryMap = new Map(
    categories.map((category) => [category.id, category])
  );

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
        name: 'Dairy Products',
        item: absoluteUrl('/dairy-products'),
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

            <span className="text-gray-900">
              Dairy Products
            </span>
          </nav>

          <div className="max-w-4xl">
            <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
              Fresh Dairy Products
            </span>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Fresh Dairy Products in Latur
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600 sm:text-lg">
              Shop fresh milk, paneer, curd, ghee and other dairy products
              from Pandurang Milk Product. Check current prices and
              availability and order online or directly through WhatsApp.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Our Dairy Products
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {products.length} active product
              {products.length === 1 ? '' : 's'} available
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/milk"
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-brand-300 hover:text-brand-700"
            >
              Milk
            </Link>

            <Link
              href="/cow-milk"
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-brand-300 hover:text-brand-700"
            >
              Cow Milk
            </Link>

            <Link
              href="/buffalo-milk"
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-brand-300 hover:text-brand-700"
            >
              Buffalo Milk
            </Link>

            <Link
              href="/paneer"
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-brand-300 hover:text-brand-700"
            >
              Paneer
            </Link>

            <Link
              href="/curd"
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-brand-300 hover:text-brand-700"
            >
              Curd
            </Link>

            <Link
              href="/ghee"
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-brand-300 hover:text-brand-700"
            >
              Ghee
            </Link>
          </div>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const category = product.category_id
                ? categoryMap.get(product.category_id)
                : undefined;

              return (
                <article
                  key={product.id}
                  className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                >
                  <Link
                    href={`/products/${product.id}`}
                    className="group block"
                  >
                    <div className="relative aspect-square overflow-hidden bg-gray-100">
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

                      {category && (
                        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm backdrop-blur">
                          {category.name}
                        </span>
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
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              No dairy products are currently available
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Please check again later or contact Pandurang Milk Product.
            </p>

            <Link
              href="/products"
              className="mt-5 inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              View Products
            </Link>
          </div>
        )}

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <Link
            href="/milk"
            className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm"
          >
            <h2 className="font-semibold text-gray-900">
              Fresh Milk
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Explore cow milk and buffalo milk options.
            </p>

            <span className="mt-4 inline-block text-sm font-semibold text-brand-700">
              View Milk →
            </span>
          </Link>

          <Link
            href="/paneer"
            className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm"
          >
            <h2 className="font-semibold text-gray-900">
              Fresh Paneer
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Shop fresh malai paneer in different pack sizes.
            </p>

            <span className="mt-4 inline-block text-sm font-semibold text-brand-700">
              View Paneer →
            </span>
          </Link>

          <Link
            href="/curd"
            className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm"
          >
            <h2 className="font-semibold text-gray-900">
              Fresh Curd
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Shop fresh dahi in convenient pack sizes.
            </p>

            <span className="mt-4 inline-block text-sm font-semibold text-brand-700">
              View Curd →
            </span>
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-brand-100 bg-brand-50 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Order Dairy Products in Latur
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Choose your product, select the quantity and add it to your
            cart. You can also use the WhatsApp ordering option available
            on each product.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Browse All Products
            </Link>

            <Link
              href="/contact"
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}