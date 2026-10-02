import Link from 'next/link';
import { absoluteUrl, createPageMetadata } from '@/lib/seo';
import { createClient } from '@/lib/supabase/server';
import { ProductOrderControls } from '@/components/ProductOrderControls';
import { ProductPrice } from '@/components/ProductPrice';
import { StockBadge } from '@/components/StockBadge';
import { JsonLd } from '@/components/JsonLd';

const MILK_CATEGORY_ID =
  'ef583b79-ad1b-44bb-ac3b-67225b3daee7';

export const revalidate = 30;

export const metadata = createPageMetadata({
  title: 'Fresh Milk in Latur | Cow Milk & Buffalo Milk',
  description:
    'Buy fresh cow milk and buffalo milk in Latur from Pandurang Milk Product. Order fresh dairy milk online with delivery in selected areas of Latur District.',
  path: '/milk',
  keywords: [
    'fresh milk in Latur',
    'milk in Latur',
    'cow milk in Latur',
    'buffalo milk in Latur',
    'buy milk online Latur',
    'fresh cow milk Latur',
    'fresh buffalo milk Latur',
    'milk delivery Latur',
    'online milk delivery Latur',
    'Pandurang Milk Product',
  ],
});

type MilkProduct = {
  id: string;
  name: string;
  name_marathi: string | null;
  description: string | null;
  category_id: string | null;
  sku: string;
  unit: string;
  net_quantity: number | null;
  price: number;
  mrp: number | null;
  image_url: string | null;
  stock_quantity: number | null;
  delivery_available: boolean;
  is_active: boolean;
};

async function getMilkProducts(): Promise<MilkProduct[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('products')
    .select(
      `
        id,
        name,
        name_marathi,
        description,
        category_id,
        sku,
        unit,
        net_quantity,
        price,
        mrp,
        image_url,
        stock_quantity,
        delivery_available,
        is_active
      `
    )
    .eq('is_active', true)
    .eq('category_id', MILK_CATEGORY_ID)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load milk products:', error);
    return [];
  }

  return (data ?? []) as MilkProduct[];
}

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
      name: 'Milk',
      item: absoluteUrl('/milk'),
    },
  ],
};

function getProductImage(product: MilkProduct): string {
  if (product.image_url) {
    return product.image_url;
  }

  return '/logo.png';
}

export default async function MilkPage() {
  const products = await getMilkProducts();

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />

      <main className="min-h-screen bg-white">
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-cyan-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
                Fresh Dairy Milk
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                Fresh Milk in Latur
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600 sm:text-xl">
                Shop fresh cow milk and buffalo milk from Pandurang Milk
                Product. Enjoy quality dairy milk with convenient delivery in
                selected areas of Latur District.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="#milk-products"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Shop Milk
                </a>

                <Link
                  href="/products"
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                >
                  View All Products
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          id="milk-products"
          className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
        >
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Fresh Milk Products
            </h2>

            <p className="mt-2 text-gray-600">
              Choose from our available fresh milk products.
            </p>
          </div>

          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center">
              <div className="mx-auto max-w-md">
                <h3 className="text-xl font-semibold text-gray-900">
                  Milk products are currently unavailable
                </h3>

                <p className="mt-2 text-gray-600">
                  Please check back soon or explore our other dairy products.
                </p>

                <Link
                  href="/products"
                  className="mt-6 inline-flex items-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Browse Products
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => {
                const image = getProductImage(product);
                const stockQuantity = product.stock_quantity ?? 0;
                const isOutOfStock = stockQuantity <= 0;

                return (
                  <article
                    key={product.id}
                    className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <Link href={`/products/${product.id}`}>
                      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                        <img
                          src={image}
                          alt={`${product.name} - Fresh milk from Pandurang Milk Product`}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />

                        <div className="absolute right-3 top-3">
                          <StockBadge
                            availableQuantity={stockQuantity}
                          />
                        </div>
                      </div>
                    </Link>

                    <div className="p-5">
                      <Link href={`/products/${product.id}`}>
                        <h3 className="text-xl font-semibold text-gray-900 transition group-hover:text-blue-600">
                          {product.name}
                        </h3>
                      </Link>

                      {product.description && (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">
                          {product.description}
                        </p>
                      )}

                      <div className="mt-4 flex items-end justify-between gap-4">
                        <div>
                          <ProductPrice
                            price={product.price}
                          />
                        </div>

                        {isOutOfStock && (
                          <span className="text-sm font-medium text-red-600">
                            Out of stock
                          </span>
                        )}
                      </div>

                      <div className="mt-5">
                        <ProductOrderControls
                          product={{
                            id: product.id,
                            name: product.name,
                            name_marathi: product.name_marathi,
                            category_id: product.category_id,
                            sku: product.sku,
                            unit: product.unit,
                            net_quantity: product.net_quantity,
                            selling_price: product.price,
                            mrp: product.mrp,
                            image_url: product.image_url,
                            available_quantity:
                              product.stock_quantity ?? 0,
                            delivery_available:
                              product.delivery_available,
                            is_active: product.is_active,
                          }}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="border-y border-gray-100 bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-3">
              <div>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  ✓
                </div>

                <h3 className="text-lg font-semibold text-gray-900">
                  Fresh Milk
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Fresh dairy milk products prepared with quality and
                  freshness in mind.
                </p>
              </div>

              <div>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  ✓
                </div>

                <h3 className="text-lg font-semibold text-gray-900">
                  Convenient Delivery
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Delivery is available in selected areas of Latur District.
                </p>
              </div>

              <div>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  ✓
                </div>

                <h3 className="text-lg font-semibold text-gray-900">
                  Quality Dairy Products
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Explore milk and other dairy products from Pandurang Milk
                  Product.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-blue-50 px-6 py-10 text-center sm:px-10">
            <h2 className="text-3xl font-bold text-gray-900">
              Looking for More Dairy Products?
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-gray-600">
              Explore paneer, curd, ghee and other dairy products available
              from Pandurang Milk Product.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/paneer"
                className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50"
              >
                Paneer
              </Link>

              <Link
                href="/curd"
                className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50"
              >
                Curd
              </Link>

              <Link
                href="/ghee"
                className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50"
              >
                Ghee
              </Link>

              <Link
                href="/dairy-products"
                className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50"
              >
                All Dairy Products
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 lg:px-8">
            <div className="prose prose-gray max-w-none">
              <h2>Buy Fresh Milk Online in Latur</h2>

              <p>
                Pandurang Milk Product provides fresh milk and dairy products
                to customers in selected areas of Latur District, Maharashtra.
                Customers can browse available milk products online, check
                prices and place orders for convenient delivery.
              </p>

              <h3>Fresh Cow Milk and Buffalo Milk</h3>

              <p>
                Our milk category includes fresh cow milk and buffalo milk,
                depending on product availability. Product prices, units and
                stock information are displayed on each product card.
              </p>

              <h3>Milk Delivery in Latur District</h3>

              <p>
                Delivery availability depends on the selected delivery area.
                Before placing an order, customers should check whether their
                location is covered by our delivery service.
              </p>

              <h3>Other Dairy Products</h3>

              <p>
                In addition to milk, Pandurang Milk Product offers dairy
                products such as paneer, curd, ghee and other products. Visit
                the products page to explore the complete selection.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-gray-100 bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 sm:flex-row sm:p-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Need Help Ordering?
                </h2>

                <p className="mt-2 text-gray-600">
                  Contact Pandurang Milk Product directly for product and
                  delivery information.
                </p>
              </div>

              <a
                href="https://wa.me/917028591828?text=Hello%20Pandurang%20Milk%20Product%2C%20I%20want%20information%20about%20milk%20products."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
              >
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}