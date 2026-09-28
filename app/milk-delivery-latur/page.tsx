import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';

export const metadata = createPageMetadata({
  title: 'Milk Delivery in Latur | Fresh Milk Delivery',
  description:
    'Order fresh milk and dairy products for delivery in selected areas of Latur District from Pandurang Milk Product. Shop cow milk, buffalo milk, paneer, curd and ghee online.',
  path: '/milk-delivery-latur',
  keywords: [
    'milk delivery in Latur',
    'fresh milk delivery Latur',
    'online milk delivery Latur',
    'milk delivery Latur',
    'home milk delivery Latur',
    'order milk online Latur',
    'buy milk online Latur',
    'fresh cow milk delivery Latur',
    'fresh buffalo milk delivery Latur',
    'dairy delivery Latur',
    'milk products delivery Latur',
    'Pandurang Milk Product',
  ],
});

export default function MilkDeliveryLaturPage() {
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
        name: 'Milk Delivery in Latur',
        item: 'https://pandurangmilk.in/milk-delivery-latur',
      },
    ],
  };

  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Milk and Dairy Product Delivery',
    provider: {
      '@type': 'Organization',
      name: 'Pandurang Milk Product',
      url: 'https://pandurangmilk.in',
      telephone: '+91-7028591828',
    },
    areaServed: {
      '@type': 'AdministrativeArea',
      name: 'Latur District',
    },
    serviceType: 'Milk and dairy product delivery',
    url: 'https://pandurangmilk.in/milk-delivery-latur',
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={serviceJsonLd} />

      {/* Hero */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <nav className="mb-6 text-sm text-gray-500">
            <Link
              href="/"
              className="hover:text-brand-700"
            >
              Home
            </Link>

            <span className="mx-2">/</span>

            <span className="text-gray-900">
              Milk Delivery in Latur
            </span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
                Fresh Milk & Dairy Delivery
              </span>

              <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Milk Delivery in Latur
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
                Order fresh milk and dairy products from Pandurang Milk
                Product. Choose from cow milk, buffalo milk, paneer,
                curd, ghee and other dairy products available for
                delivery in selected areas of Latur District.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/milk"
                  className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  Shop Fresh Milk
                </Link>

                <Link
                  href="/products"
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-800 transition hover:border-brand-300 hover:text-brand-700"
                >
                  View All Products
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-brand-100 bg-brand-50 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-gray-900">
                Fresh Dairy Products
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                Browse our current product range and order the quantity
                you need.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Link
                  href="/cow-milk"
                  className="rounded-xl bg-white p-4 ring-1 ring-gray-100 transition hover:ring-brand-200"
                >
                  <div className="text-2xl">🥛</div>
                  <div className="mt-2 text-sm font-semibold text-gray-900">
                    Cow Milk
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    गाईचे दूध
                  </div>
                </Link>

                <Link
                  href="/buffalo-milk"
                  className="rounded-xl bg-white p-4 ring-1 ring-gray-100 transition hover:ring-brand-200"
                >
                  <div className="text-2xl">🥛</div>
                  <div className="mt-2 text-sm font-semibold text-gray-900">
                    Buffalo Milk
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    म्हशीचे दूध
                  </div>
                </Link>

                <Link
                  href="/paneer"
                  className="rounded-xl bg-white p-4 ring-1 ring-gray-100 transition hover:ring-brand-200"
                >
                  <div className="text-2xl">🧀</div>
                  <div className="mt-2 text-sm font-semibold text-gray-900">
                    Paneer
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    पनीर
                  </div>
                </Link>

                <Link
                  href="/curd"
                  className="rounded-xl bg-white p-4 ring-1 ring-gray-100 transition hover:ring-brand-200"
                >
                  <div className="text-2xl">🥣</div>
                  <div className="mt-2 text-sm font-semibold text-gray-900">
                    Curd
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    दही
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            How to Order Milk Online in Latur
          </h2>

          <p className="mt-3 text-base leading-7 text-gray-600">
            Ordering from Pandurang Milk Product is simple. Select your
            product, choose the quantity and continue with the available
            ordering option.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-700">
              1
            </div>

            <h3 className="mt-4 font-semibold text-gray-900">
              Choose your product
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Browse fresh milk, paneer, curd, ghee and other dairy
              products.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-700">
              2
            </div>

            <h3 className="mt-4 font-semibold text-gray-900">
              Select quantity
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Select the quantity you want and add the product to your
              cart.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-700">
              3
            </div>

            <h3 className="mt-4 font-semibold text-gray-900">
              Place your order
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Complete the checkout process or use the WhatsApp ordering
              option available on product pages.
            </p>
          </div>
        </div>
      </section>

      {/* Product links */}
      <section className="border-y border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Fresh Milk and Dairy Products
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/milk"
              className="rounded-2xl border border-gray-200 p-5 transition hover:border-brand-300 hover:shadow-sm"
            >
              <h3 className="font-semibold text-gray-900">
                Fresh Milk
              </h3>

              <p className="mt-2 text-sm text-gray-600">
                Explore available milk products.
              </p>

              <span className="mt-4 inline-block text-sm font-semibold text-brand-700">
                View Milk →
              </span>
            </Link>

            <Link
              href="/paneer"
              className="rounded-2xl border border-gray-200 p-5 transition hover:border-brand-300 hover:shadow-sm"
            >
              <h3 className="font-semibold text-gray-900">
                Fresh Paneer
              </h3>

              <p className="mt-2 text-sm text-gray-600">
                Shop fresh malai paneer.
              </p>

              <span className="mt-4 inline-block text-sm font-semibold text-brand-700">
                View Paneer →
              </span>
            </Link>

            <Link
              href="/curd"
              className="rounded-2xl border border-gray-200 p-5 transition hover:border-brand-300 hover:shadow-sm"
            >
              <h3 className="font-semibold text-gray-900">
                Fresh Curd
              </h3>

              <p className="mt-2 text-sm text-gray-600">
                Explore fresh dahi options.
              </p>

              <span className="mt-4 inline-block text-sm font-semibold text-brand-700">
                View Curd →
              </span>
            </Link>

            <Link
              href="/ghee"
              className="rounded-2xl border border-gray-200 p-5 transition hover:border-brand-300 hover:shadow-sm"
            >
              <h3 className="font-semibold text-gray-900">
                Desi Ghee
              </h3>

              <p className="mt-2 text-sm text-gray-600">
                Explore available ghee products.
              </p>

              <span className="mt-4 inline-block text-sm font-semibold text-brand-700">
                View Ghee →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Delivery area note */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Milk Delivery Across Selected Areas of Latur District
          </h2>

          <p className="mt-3 max-w-4xl text-sm leading-7 text-gray-600">
            Delivery availability depends on the delivery areas currently
            configured by Pandurang Milk Product. During checkout, enter
            your delivery address and verify that your location is
            serviceable before placing the order.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Shop Products
            </Link>

            <Link
              href="/contact"
              className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 hover:border-brand-300 hover:text-brand-700"
            >
              Contact Pandurang Milk Product
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Milk Delivery FAQs
          </h2>

          <div className="mt-6 space-y-4">
            <details className="rounded-2xl border border-gray-200 bg-white p-5">
              <summary className="cursor-pointer font-semibold text-gray-900">
                Do you deliver milk in Latur?
              </summary>

              <p className="mt-3 text-sm leading-6 text-gray-600">
                Pandurang Milk Product provides delivery in selected
                areas configured in the delivery system. Availability
                should be checked using your delivery address during
                checkout.
              </p>
            </details>

            <details className="rounded-2xl border border-gray-200 bg-white p-5">
              <summary className="cursor-pointer font-semibold text-gray-900">
                What dairy products can I order?
              </summary>

              <p className="mt-3 text-sm leading-6 text-gray-600">
                The current product range includes milk, curd, paneer,
                ghee and other dairy products. Availability and stock can
                change over time.
              </p>
            </details>

            <details className="rounded-2xl border border-gray-200 bg-white p-5">
              <summary className="cursor-pointer font-semibold text-gray-900">
                Can I order through WhatsApp?
              </summary>

              <p className="mt-3 text-sm leading-6 text-gray-600">
                Yes. Product pages provide a WhatsApp ordering option
                where available, allowing you to send the selected
                product and quantity directly to the business.
              </p>
            </details>

            <details className="rounded-2xl border border-gray-200 bg-white p-5">
              <summary className="cursor-pointer font-semibold text-gray-900">
                Can I order cow milk and buffalo milk?
              </summary>

              <p className="mt-3 text-sm leading-6 text-gray-600">
                Yes. Visit the dedicated cow milk and buffalo milk pages
                to see the currently available products and pack sizes.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-brand-600">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Ready to order fresh dairy products?
              </h2>

              <p className="mt-2 text-sm text-white/80">
                Browse the current products and check availability.
              </p>
            </div>

            <Link
              href="/products"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-brand-700 transition hover:bg-gray-100"
            >
              Shop Now
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}