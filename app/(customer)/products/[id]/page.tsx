import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductOrderControls } from '@/components/ProductOrderControls';
import { ProductPrice } from '@/components/ProductPrice';
import { StockBadge } from '@/components/StockBadge';
import { JsonLd } from '@/components/JsonLd';
import { formatProductUnit } from '@/lib/format-unit';
import { getPublicProduct } from '@/lib/seo-data';
import { productJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { SITE_NAME, SITE_URL } from '@/lib/seo';

export const revalidate = 60;

type ProductPageProps = {
  params: {
    id: string;
  };
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const product = await getPublicProduct(params.id);

  if (!product) {
    return {
      title: 'Product Not Found',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const productName = product.name;

  const categoryName =
    product.product_categories?.name ||
    product.product_categories?.name_marathi ||
    'Dairy Product';

  const description =
    product.short_description ||
    product.description ||
    `Buy ${productName} from ${SITE_NAME}. Fresh dairy products with delivery in selected areas of Latur District, Maharashtra.`;

  const canonical = `${SITE_URL}/products/${product.id}`;

  return {
    title: `${productName} | Fresh ${categoryName} in Latur`,
    description,
    keywords: [
      productName,
      `${productName} Latur`,
      `buy ${productName} online`,
      `${categoryName} in Latur`,
      'milk products in Latur',
      'dairy products in Latur',
      'Pandurang Milk Product',
    ],
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${productName} | ${SITE_NAME}`,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: 'en_IN',
      type: 'website',
      ...(product.image_url
        ? {
            images: [
              {
                url: product.image_url,
                alt: productName,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${productName} | ${SITE_NAME}`,
      description,
      ...(product.image_url
        ? {
            images: [product.image_url],
          }
        : {}),
    },
  };
}

export default async function ProductDetailPage({
  params,
}: ProductPageProps) {
  const product = await getPublicProduct(params.id);

  if (!product) {
    notFound();
  }

  const inStock =
    product.delivery_available &&
    product.available_quantity > 0;

  const productSchema = productJsonLd(product);

  const breadcrumbSchema = breadcrumbJsonLd([
    {
      name: 'Home',
      url: SITE_URL,
    },
    {
      name: 'Products',
      url: `${SITE_URL}/products`,
    },
    {
      name: product.name,
      url: `${SITE_URL}/products/${product.id}`,
    },
  ]);

  return (
    <main className="min-h-screen bg-cream-50">
      <JsonLd data={[productSchema, breadcrumbSchema]} />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">

        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-5 sm:mb-6"
        >
          <Link
            href="/products"
            className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-brand-700 transition hover:bg-brand-50 hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            ← Back to Products
          </Link>
        </nav>

        {/* Product */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:gap-10">

          {/* Product image */}
          <div className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="aspect-square w-full overflow-hidden bg-cream-100">
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt={`${product.name} - ${SITE_NAME}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-gray-400">
                    No image available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Product information */}
          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7 lg:p-8">

            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 sm:text-sm">
              Fresh Dairy Product
            </p>

            <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl lg:text-4xl">
              {product.name}
            </h1>

            {product.name_marathi && (
              <p className="mt-2 text-sm leading-6 text-gray-500 sm:text-base">
                {product.name_marathi}
              </p>
            )}

            {/* Price */}
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
              <ProductPrice
                price={product.selling_price}
                mrp={product.mrp}
                size="lg"
              />

              <span className="text-sm font-medium text-gray-500">
                /{' '}
                {formatProductUnit(
                  product.unit,
                  product.net_quantity,
                )}
              </span>
            </div>

            {/* Stock */}
            <div className="mt-4">
              <StockBadge
                availableQuantity={product.available_quantity}
                lowStockThreshold={product.min_stock_level}
              />
            </div>

            {/* Description */}
            {(product.short_description || product.description) && (
              <div className="mt-5 border-t border-gray-100 pt-5">
                {product.short_description && (
                  <p className="font-medium leading-6 text-gray-800">
                    {product.short_description}
                  </p>
                )}

                {product.description && (
                  <p className="mt-2 text-sm leading-6 text-gray-600 sm:text-base">
                    {product.description}
                  </p>
                )}
              </div>
            )}

            {/* Product details */}
            <div className="mt-6 border-t border-gray-100 pt-5">
              <h2 className="text-sm font-semibold text-gray-900">
                Product Details
              </h2>

              <dl className="mt-3 divide-y divide-gray-100 text-sm">
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

                <Row
                  label="Pack size"
                  value={formatProductUnit(
                    product.unit,
                    product.net_quantity,
                  )}
                />

                <Row
                  label="SKU"
                  value={product.sku}
                />

                {product.product_code && (
                  <Row
                    label="Product code"
                    value={product.product_code}
                  />
                )}

                <Row
                  label="Delivery"
                  value={
                    product.delivery_available
                      ? 'Available for delivery'
                      : 'Not available for delivery'
                  }
                />
              </dl>
            </div>

            {/* Ordering */}
            <div className="mt-6 border-t border-gray-100 pt-6">
              {inStock ? (
                <ProductOrderControls
                  product={{
                    id: product.id,
                    name: product.name,
                    name_marathi: product.name_marathi,
                    category_id: product.category_id,
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
                <div>
                  <button
                    type="button"
                    disabled
                    className="inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-lg bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-400 sm:w-auto"
                  >
                    Unavailable
                  </button>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    This product is currently unavailable for delivery.
                  </p>
                </div>
              )}
            </div>

            {/* Back link */}
            <div className="mt-5">
              <Link
                href="/products"
                className="inline-flex min-h-11 items-center text-sm font-medium text-gray-600 transition hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                ← Continue shopping
              </Link>
            </div>
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
    <div className="flex min-h-11 items-center justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-gray-500">
        {label}
      </dt>

      <dd className="min-w-0 text-right font-medium text-gray-800">
        {value}
      </dd>
    </div>
  );
}