import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { JsonLd } from '@/components/JsonLd';
import {
  absoluteUrl,
  BUSINESS_ADDRESS,
  BUSINESS_EMAIL,
  BUSINESS_NAME,
  BUSINESS_PHONE,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  createPageMetadata,
} from '@/lib/seo';

export const revalidate = 60;

export const metadata = createPageMetadata({
  title:
    'Fresh Milk & Dairy Products in Latur | Pandurang Milk Product',
  description:
    'Buy fresh cow milk, buffalo milk, paneer, curd, ghee and other dairy products from Pandurang Milk Product. Delivery available in selected areas of Latur District, Maharashtra.',
  path: '/',
  image: DEFAULT_OG_IMAGE,
  keywords: [
    'fresh milk in Latur',
    'milk delivery in Latur',
    'buy milk online Latur',
    'cow milk Latur',
    'buffalo milk Latur',
    'paneer Latur',
    'curd Latur',
    'ghee Latur',
    'dairy products Latur',
    'Pandurang Milk Product',
  ],
});

type TodayProductRow = {
  product_id: string;
  display_order: number;
};

type TodayProduct = {
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
  min_stock_level: number | null;
  delivery_available: boolean;
  is_active: boolean;
};

const CATEGORY_LINKS = [
  {
    href: '/milk',
    title: 'Milk',
    titleMarathi: 'दूध',
    description: 'Fresh cow and buffalo milk',
    icon: '🥛',
  },
  {
    href: '/cow-milk',
    title: 'Cow Milk',
    titleMarathi: 'गाईचे दूध',
    description: 'Fresh desi cow milk',
    icon: '🐄',
  },
  {
    href: '/buffalo-milk',
    title: 'Buffalo Milk',
    titleMarathi: 'म्हशीचे दूध',
    description: 'Fresh buffalo milk',
    icon: '🥛',
  },
  {
    href: '/paneer',
    title: 'Paneer',
    titleMarathi: 'पनीर',
    description: 'Fresh malai paneer',
    icon: '🧀',
  },
  {
    href: '/curd',
    title: 'Curd',
    titleMarathi: 'दही',
    description: 'Fresh curd and buttermilk',
    icon: '🥣',
  },
  {
    href: '/ghee',
    title: 'Ghee',
    titleMarathi: 'तूप',
    description: 'Traditional desi ghee',
    icon: '🧈',
  },
  {
    href: '/dairy-products',
    title: 'Dairy Products',
    titleMarathi: 'दुग्धजन्य पदार्थ',
    description: 'Explore all dairy products',
    icon: '🛒',
  },
  {
    href: '/milk-delivery-latur',
    title: 'Milk Delivery',
    titleMarathi: 'दूध डिलिव्हरी',
    description: 'Selected Latur areas',
    icon: '🚚',
  },
];

function formatPrice(value: number) {
  return `₹${Number(value).toFixed(2)}`;
}

function formatQuantity(product: TodayProduct) {
  const unit = (product.unit ?? '').trim();

  if (/\d/.test(unit)) {
    return unit;
  }

  if (
    product.net_quantity !== null &&
    product.net_quantity !== undefined
  ) {
    return `${product.net_quantity} ${unit}`.trim();
  }

  return unit;
}

function ProductImage({
  product,
}: {
  product: TodayProduct;
}) {
  if (product.image_url) {
    return (
      <Image
        src={product.image_url}
        alt={product.name}
        fill
        sizes="(max-width: 639px) 46vw, (max-width: 767px) 44vw, (max-width: 1023px) 30vw, 23vw"
        className="object-cover transition duration-300 group-hover:scale-105"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-brand-50 text-4xl sm:text-5xl">
      🥛
    </div>
  );
}

function ProductCard({
  product,
}: {
  product: TodayProduct;
}) {
  const hasDiscount =
    product.mrp !== null &&
    product.mrp > product.selling_price;

  const outOfStock =
    !product.delivery_available ||
    product.available_quantity <= 0;

  return (
    <article className="group min-w-0 max-w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <Link
        href={`/products/${product.id}`}
        className="block min-w-0 max-w-full"
        aria-label={`View ${product.name}`}
      >
        <div className="relative aspect-square w-full max-w-full overflow-hidden bg-gray-50">
          <ProductImage product={product} />

          {hasDiscount && (
            <span className="absolute left-2.5 top-2.5 rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600 sm:left-3 sm:top-3 sm:text-xs">
              Offer
            </span>
          )}

          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-3 text-center">
              <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-800 sm:px-4 sm:py-2 sm:text-sm">
                Currently unavailable
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 p-3 sm:p-4">
          <h3 className="line-clamp-2 min-h-[38px] text-sm font-bold leading-5 text-gray-900 sm:min-h-0 sm:text-base">
            {product.name}
          </h3>

          {product.name_marathi && (
            <p className="mt-1 line-clamp-1 text-[11px] text-gray-500 sm:text-sm">
              {product.name_marathi}
            </p>
          )}

          <p className="mt-1.5 text-[11px] font-medium text-gray-400 sm:mt-2 sm:text-xs">
            {formatQuantity(product)}
          </p>

          <div className="mt-2.5 flex min-w-0 items-end justify-between gap-2 sm:mt-3 sm:gap-3">
            <div className="min-w-0">
              <p className="text-base font-extrabold text-brand-700 sm:text-lg">
                {formatPrice(product.selling_price)}
              </p>

              {hasDiscount && product.mrp !== null && (
                <p className="text-[10px] text-gray-400 line-through sm:text-xs">
                  MRP {formatPrice(product.mrp)}
                </p>
              )}
            </div>

            <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1.5 text-[10px] font-bold text-brand-700 sm:px-3 sm:text-xs">
              View
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default async function HomePage() {
  const supabase = createClient();

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/#business`,
    name: BUSINESS_NAME,
    url: SITE_URL,
    telephone: BUSINESS_PHONE,
    email: BUSINESS_EMAIL,
    description:
      'Fresh milk and dairy products delivered in selected areas of Latur District, Maharashtra.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS_ADDRESS,
      addressLocality: 'Latur District',
      addressRegion: 'Maharashtra',
      addressCountry: 'IN',
    },
  };

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: {
      '@id': `${SITE_URL}/#business`,
    },
  };

  const {
    data: todayRowsRaw,
    error: todayRowsError,
  } = await (supabase as any)
    .from('today_products')
    .select('product_id, display_order')
    .order('display_order', {
      ascending: true,
    });

  const todayRows: TodayProductRow[] = Array.isArray(
    todayRowsRaw,
  )
    ? todayRowsRaw
        .map(
          (row: unknown): TodayProductRow | null => {
            if (
              typeof row !== 'object' ||
              row === null
            ) {
              return null;
            }

            const value = row as {
              product_id?: unknown;
              display_order?: unknown;
            };

            if (
              typeof value.product_id !== 'string'
            ) {
              return null;
            }

            const displayOrder =
              typeof value.display_order === 'number'
                ? value.display_order
                : Number(value.display_order);

            if (!Number.isFinite(displayOrder)) {
              return null;
            }

            return {
              product_id: value.product_id,
              display_order: displayOrder,
            };
          },
        )
        .filter(
          (
            row: TodayProductRow | null,
          ): row is TodayProductRow =>
            row !== null,
        )
    : [];

  const todayProductIds: string[] =
    todayRows.map(
      (row: TodayProductRow) =>
        row.product_id,
    );

  let products: TodayProduct[] = [];

  if (todayProductIds.length > 0) {
    const {
      data: todayProductsRaw,
      error: todayProductsError,
    } = await supabase
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
        `,
      )
      .in('id', todayProductIds)
      .eq('is_active', true);

    if (todayProductsError) {
      console.error(
        "Failed to load Today's Products:",
        todayProductsError,
      );
    }

    const typedTodayProducts: TodayProduct[] =
      Array.isArray(todayProductsRaw)
        ? todayProductsRaw.map(
            (
              product,
            ): TodayProduct => ({
              id: String(product.id),

              name: String(product.name),

              name_marathi:
                product.name_marathi ?? null,

              category_id:
                product.category_id ?? null,

              sku: String(product.sku),

              unit: String(product.unit),

              net_quantity:
                product.net_quantity === null ||
                product.net_quantity === undefined
                  ? null
                  : Number(product.net_quantity),

              selling_price: Number(
                product.selling_price,
              ),

              mrp:
                product.mrp === null ||
                product.mrp === undefined
                  ? null
                  : Number(product.mrp),

              image_url:
                product.image_url ?? null,

              available_quantity: Number(
                product.available_quantity,
              ),

              min_stock_level:
                product.min_stock_level === null ||
                product.min_stock_level === undefined
                  ? null
                  : Number(
                      product.min_stock_level,
                    ),

              delivery_available: Boolean(
                product.delivery_available,
              ),

              is_active: Boolean(
                product.is_active,
              ),
            }),
          )
        : [];

    const productMap =
      new Map<string, TodayProduct>();

    typedTodayProducts.forEach(
      (product: TodayProduct) => {
        productMap.set(
          product.id,
          product,
        );
      },
    );

    products = todayRows
      .map(
        (
          row: TodayProductRow,
        ): TodayProduct | undefined =>
          productMap.get(
            row.product_id,
          ),
      )
      .filter(
        (
          product: TodayProduct | undefined,
        ): product is TodayProduct =>
          product !== undefined,
      );
  }

  if (todayRowsError) {
    console.error(
      'Failed to load today_products:',
      todayRowsError,
    );
  }

  return (
    <main className="min-h-screen w-full min-w-0 max-w-full overflow-x-hidden bg-white pb-24 md:pb-0">
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={websiteJsonLd} />

      {/* HERO */}
      <section className="w-full min-w-0 max-w-full overflow-hidden bg-gradient-to-br from-brand-50 via-white to-green-50">
        <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-10 sm:py-14 md:px-6 md:py-24">
          <div className="grid min-w-0 items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="min-w-0 max-w-full">
              <span className="inline-flex max-w-full rounded-full bg-brand-100 px-3 py-1.5 text-xs font-bold text-brand-800 sm:px-4 sm:py-2 sm:text-sm">
                Fresh • Local • Trusted
              </span>

              <h1 className="mt-4 max-w-full text-4xl font-extrabold leading-[1.05] tracking-tight text-gray-900 sm:mt-5 sm:text-5xl lg:text-6xl">
                Farm to
                <span className="block text-brand-700">
                  Doorstep
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-base leading-7 text-gray-600 sm:mt-5 sm:text-lg sm:leading-8">
                Fresh milk and quality dairy
                products from Pandurang Milk
                Product, delivered to selected
                areas of Latur District.
              </p>

              <p className="mt-2 text-sm font-semibold text-gray-500">
                पांडुरंग मिल्क प्रोडक्ट
              </p>

              <div className="mt-6 grid w-full min-w-0 grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
                <Link
                  href="/products"
                  className="inline-flex min-h-12 min-w-0 w-full items-center justify-center rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 sm:w-auto"
                >
                  Order Now
                </Link>

                <Link
                  href="/milk-delivery-latur"
                  className="inline-flex min-h-12 min-w-0 w-full items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-800 transition hover:bg-gray-50 sm:w-auto"
                >
                  Check Delivery
                </Link>
              </div>

              <p className="mt-4 max-w-full text-xs leading-5 text-gray-500 sm:text-sm">
                📍 Anandwadi (Gaur), Latur District,
                Maharashtra
              </p>
            </div>

            <div className="relative min-w-0 max-w-full">
              <div className="w-full min-w-0 max-w-full rounded-3xl border border-brand-100 bg-white/90 p-3 shadow-lg backdrop-blur sm:p-5 md:p-8 md:shadow-xl">
                <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:gap-4">
                  <Link
                    href="/milk"
                    aria-label="Explore fresh milk products"
                    className="group min-w-0 max-w-full overflow-hidden rounded-2xl bg-brand-50 p-3.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md sm:p-5"
                  >
                    <div className="text-2xl sm:text-3xl">
                      🥛
                    </div>

                    <p className="mt-2 truncate text-sm font-bold text-gray-900 group-hover:text-brand-700 sm:mt-3 sm:text-base">
                      Fresh Milk
                    </p>

                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-gray-500 sm:text-sm">
                      Cow & buffalo milk
                    </p>

                    <p className="mt-2 text-[10px] font-bold text-brand-700 sm:mt-3 sm:text-xs">
                      Explore →
                    </p>
                  </Link>

                  <Link
                    href="/dairy-products"
                    aria-label="Explore dairy products"
                    className="group min-w-0 max-w-full overflow-hidden rounded-2xl bg-orange-50 p-3.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md sm:p-5"
                  >
                    <div className="text-2xl sm:text-3xl">
                      🧈
                    </div>

                    <p className="mt-2 truncate text-sm font-bold text-gray-900 group-hover:text-orange-700 sm:mt-3 sm:text-base">
                      Dairy
                    </p>

                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-gray-500 sm:text-sm">
                      Quality products
                    </p>

                    <p className="mt-2 text-[10px] font-bold text-orange-700 sm:mt-3 sm:text-xs">
                      Explore →
                    </p>
                  </Link>

                  <Link
                    href="/milk-delivery-latur"
                    aria-label="Check milk delivery areas in Latur"
                    className="group min-w-0 max-w-full overflow-hidden rounded-2xl bg-green-50 p-3.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md sm:p-5"
                  >
                    <div className="text-2xl sm:text-3xl">
                      🚚
                    </div>

                    <p className="mt-2 truncate text-sm font-bold text-gray-900 group-hover:text-green-700 sm:mt-3 sm:text-base">
                      Delivery
                    </p>

                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-gray-500 sm:text-sm">
                      Selected Latur areas
                    </p>

                    <p className="mt-2 text-[10px] font-bold text-green-700 sm:mt-3 sm:text-xs">
                      Check →
                    </p>
                  </Link>

                  <Link
                    href="/products"
                    aria-label="Browse products and order online"
                    className="group min-w-0 max-w-full overflow-hidden rounded-2xl bg-blue-50 p-3.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md sm:p-5"
                  >
                    <div className="text-2xl sm:text-3xl">
                      📱
                    </div>

                    <p className="mt-2 truncate text-sm font-bold text-gray-900 group-hover:text-blue-700 sm:mt-3 sm:text-base">
                      Easy Order
                    </p>

                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-gray-500 sm:text-sm">
                      Online & WhatsApp
                    </p>

                    <p className="mt-2 text-[10px] font-bold text-blue-700 sm:mt-3 sm:text-xs">
                      Order →
                    </p>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="w-full min-w-0 max-w-full border-y border-gray-100 bg-white">
        <div className="mx-auto grid w-full min-w-0 max-w-7xl grid-cols-2 md:grid-cols-4">
          <div className="min-w-0 border-b border-r border-gray-100 px-3 py-5 text-center sm:px-5 sm:py-7 md:border-b-0">
            <p className="truncate text-xl font-extrabold text-brand-700 sm:text-2xl">
              Fresh
            </p>

            <p className="mt-1 truncate text-xs text-gray-500 sm:text-sm">
              Dairy Products
            </p>
          </div>

          <div className="min-w-0 border-b border-gray-100 px-3 py-5 text-center sm:px-5 sm:py-7 md:border-b-0 md:border-r">
            <p className="truncate text-xl font-extrabold text-brand-700 sm:text-2xl">
              Local
            </p>

            <p className="mt-1 truncate text-xs text-gray-500 sm:text-sm">
              Latur Delivery
            </p>
          </div>

          <div className="min-w-0 border-r border-gray-100 px-3 py-5 text-center sm:px-5 sm:py-7">
            <p className="truncate text-xl font-extrabold text-brand-700 sm:text-2xl">
              Quality
            </p>

            <p className="mt-1 truncate text-xs text-gray-500 sm:text-sm">
              Product Focus
            </p>
          </div>

          <div className="min-w-0 px-3 py-5 text-center sm:px-5 sm:py-7">
            <p className="truncate text-xl font-extrabold text-brand-700 sm:text-2xl">
              Easy
            </p>

            <p className="mt-1 truncate text-xs text-gray-500 sm:text-sm">
              Online Ordering
            </p>
          </div>
        </div>
      </section>

      {/* CATEGORY NAVIGATION */}
      <section className="w-full min-w-0 max-w-full overflow-hidden bg-gray-50 py-12 sm:py-14 md:py-16">
        <div className="mx-auto w-full min-w-0 max-w-7xl px-4 md:px-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-700 sm:text-sm">
              Explore our range
            </p>

            <h2 className="mt-2 text-2xl font-extrabold text-gray-900 sm:text-3xl">
              Fresh Milk & Dairy Products
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
              Browse milk, paneer, curd,
              ghee and other dairy products
              available from Pandurang Milk
              Product.
            </p>
          </div>

          <div className="mt-7 grid min-w-0 grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {CATEGORY_LINKS.map(
              (category) => (
                <Link
                  key={category.href}
                  href={category.href}
                  className="group min-w-0 max-w-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md sm:p-5"
                >
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0 max-w-full">
                      <div className="mb-2 text-2xl sm:text-3xl">
                        {category.icon}
                      </div>

                      <h3 className="line-clamp-2 text-sm font-bold leading-5 text-gray-900 group-hover:text-brand-700 sm:text-base">
                        {category.title}
                      </h3>

                      <p className="mt-1 truncate text-xs text-gray-500 sm:text-sm">
                        {category.titleMarathi}
                      </p>
                    </div>

                    <span className="hidden shrink-0 text-xl text-brand-600 sm:block">
                      →
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-gray-500 sm:mt-3 sm:text-xs sm:leading-5">
                    {category.description}
                  </p>

                  <span className="mt-3 block text-[10px] font-bold text-brand-700 sm:hidden">
                    Explore →
                  </span>
                </Link>
              ),
            )}
          </div>
        </div>
      </section>

      {/* TODAY'S PRODUCTS */}
      <section className="w-full min-w-0 max-w-full overflow-hidden bg-white py-12 sm:py-16">
        <div className="mx-auto w-full min-w-0 max-w-7xl px-4 md:px-6">
          <div className="flex min-w-0 items-end justify-between gap-3">
            <div className="min-w-0 max-w-full">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-700 sm:text-sm">
                Fresh picks
              </p>

              <h2 className="mt-1.5 truncate text-2xl font-extrabold text-gray-900 sm:mt-2 sm:text-3xl">
                Today&apos;s Products
              </h2>

              <p className="mt-1.5 max-w-2xl text-xs leading-5 text-gray-500 sm:mt-2 sm:text-base sm:leading-6">
                Products selected by our team
                for today&apos;s homepage.
              </p>
            </div>

            <Link
              href="/products"
              className="shrink-0 rounded-full border border-gray-300 px-3.5 py-2 text-[11px] font-bold text-gray-800 transition hover:bg-gray-50 sm:px-5 sm:py-2.5 sm:text-sm"
            >
              View All
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="mt-7 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center sm:mt-8 sm:px-6 sm:py-12">
              <div className="text-4xl">
                🥛
              </div>

              <h3 className="mt-4 text-base font-bold text-gray-900 sm:text-lg">
                Today&apos;s Products are
                being updated
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">
                Today&apos;s Products will
                appear here once Admin adds
                products to the Today&apos;s
                Products list.
              </p>

              <Link
                href="/products"
                className="mt-5 inline-flex min-h-11 items-center rounded-full bg-brand-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-700 sm:text-sm"
              >
                Browse All Products
              </Link>
            </div>
          ) : (
            <div className="mt-7 grid min-w-0 grid-cols-2 gap-3 sm:mt-8 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {products.map(
                (product: TodayProduct) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                  />
                ),
              )}
            </div>
          )}
        </div>
      </section>

      {/* MILK DELIVERY */}
      <section className="w-full min-w-0 max-w-full overflow-hidden bg-brand-700 py-12 text-white sm:py-16">
        <div className="mx-auto w-full min-w-0 max-w-7xl px-4 md:px-6">
          <div className="flex min-w-0 flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 max-w-full">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-100 sm:text-sm">
                Local delivery
              </p>

              <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                Fresh Milk Delivered in Latur
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-50 sm:text-base sm:leading-7">
                Order fresh milk and dairy
                products online and check
                delivery availability for your
                area.
              </p>
            </div>

            <Link
              href="/milk-delivery-latur"
              className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold text-brand-700 hover:bg-brand-50 sm:w-auto"
            >
              Check Delivery Areas
            </Link>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="w-full min-w-0 max-w-full overflow-hidden bg-gray-50 py-12 sm:py-16">
        <div className="mx-auto w-full min-w-0 max-w-7xl px-4 md:px-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-700 sm:text-sm">
              Why choose us
            </p>

            <h2 className="mt-2 text-2xl font-extrabold text-gray-900 sm:text-3xl">
              Quality You Can Trust
            </h2>
          </div>

          <div className="mt-7 grid min-w-0 grid-cols-1 gap-3 sm:mt-10 md:grid-cols-3 md:gap-5">
            <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-2xl">
                🥛
              </div>

              <h3 className="mt-4 font-bold text-gray-900 sm:mt-5">
                Fresh Products
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Fresh milk and dairy products
                for your everyday needs.
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-2xl">
                🚚
              </div>

              <h3 className="mt-4 font-bold text-gray-900 sm:mt-5">
                Local Delivery
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Delivery service for selected
                areas in Latur District.
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-2xl">
                🤝
              </div>

              <h3 className="mt-4 font-bold text-gray-900 sm:mt-5">
                Customer First
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Easy ordering, transparent
                pricing and direct customer
                support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="w-full min-w-0 max-w-full overflow-hidden bg-white py-12 sm:py-16">
        <div className="mx-auto w-full max-w-4xl px-4 text-center md:px-6">
          <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
            Ready to order fresh dairy
            products?
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
            Explore our products and place
            your order online.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-2.5 sm:flex sm:justify-center sm:gap-3">
            <Link
              href="/products"
              className="inline-flex min-h-12 min-w-0 w-full items-center justify-center rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white hover:bg-brand-700 sm:w-auto"
            >
              Browse Products
            </Link>

            <Link
              href="/contact"
              className="inline-flex min-h-12 min-w-0 w-full items-center justify-center rounded-full border border-gray-300 px-6 py-3 text-sm font-bold text-gray-800 hover:bg-gray-50 sm:w-auto"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="w-full min-w-0 max-w-full overflow-hidden border-t border-gray-100 bg-gray-50">
        <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-9 md:px-6">
          <div className="grid min-w-0 gap-8 sm:grid-cols-2 md:grid-cols-3">
            <div className="min-w-0 sm:col-span-2 md:col-span-1">
              <h3 className="font-extrabold text-gray-900">
                Pandurang Milk Product
              </h3>

              <p className="mt-3 max-w-sm text-sm leading-6 text-gray-500">
                Fresh milk and dairy products
                delivered in selected areas of
                Latur District, Maharashtra.
              </p>
            </div>

            <div className="min-w-0">
              <h3 className="font-bold text-gray-900">
                Quick Links
              </h3>

              <div className="mt-3 flex flex-col gap-2.5 text-sm text-gray-500">
                <Link
                  href="/products"
                  className="hover:text-brand-700"
                >
                  Products
                </Link>

                <Link
                  href="/milk-delivery-latur"
                  className="hover:text-brand-700"
                >
                  Milk Delivery
                </Link>

                <Link
                  href="/about"
                  className="hover:text-brand-700"
                >
                  About Us
                </Link>

                <Link
                  href="/contact"
                  className="hover:text-brand-700"
                >
                  Contact
                </Link>
              </div>
            </div>

            <div className="min-w-0">
              <h3 className="font-bold text-gray-900">
                Policies
              </h3>

              <div className="mt-3 flex flex-col gap-2.5 text-sm text-gray-500">
                <Link
                  href="/privacy"
                  className="hover:text-brand-700"
                >
                  Privacy Policy
                </Link>

                <Link
                  href="/terms"
                  className="hover:text-brand-700"
                >
                  Terms & Conditions
                </Link>

                <Link
                  href="/shipping-policy"
                  className="hover:text-brand-700"
                >
                  Shipping Policy
                </Link>

                <Link
                  href="/refund-policy"
                  className="hover:text-brand-700"
                >
                  Refund Policy
                </Link>
              </div>
            </div>
          </div>

          {/* Developer credit */}
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-center shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
               Website &amp; App Developed By
            </p>

            <p className="mt-1 text-sm font-bold text-gray-900">
              DNYANOBA VISHNU CHAME
            </p>

            <a
              href="tel:7620222623"
              className="mt-1 inline-flex text-sm font-semibold text-brand-700 transition hover:text-brand-800"
            >
              📞 7620222623
            </a>
          </div>

          <div className="mt-6 border-t border-gray-200 pb-2 pt-6 text-center text-[11px] text-gray-500 sm:text-xs">
            © {new Date().getFullYear()}{' '}
            Pandurang Milk Product. All rights
            reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}