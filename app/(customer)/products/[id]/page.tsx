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
    <main className="max-w-6xl mx-auto px-6 py-10">
      <JsonLd data={[productSchema, breadcrumbSchema]} />

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6"
      >
        <Link
          href="/products"
          className="text-sm text-brand-700 hover:underline"
        >
          ← Back to Products
        </Link>
      </nav>

      {/* Product */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product image */}
        <div>
          <div className="aspect-square rounded-2xl bg-cream-100 overflow-hidden">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt={`${product.name} - ${SITE_NAME}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No image available
              </div>
            )}
          </div>
        </div>

        {/* Product information */}
        <div>
          <p className="text-sm text-gray-500 mb-2">
            Fresh Dairy Product
          </p>

          <h1 className="text-3xl font-semibold text-gray-900">
            {product.name}
          </h1>

          {product.name_marathi && (
            <p className="mt-2 text-base text-gray-500">
              {product.name_marathi}
            </p>
          )}

          {/* Price */}
          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <ProductPrice
              price={product.selling_price}
              mrp={product.mrp}
              size="lg"
            />

            <span className="text-sm text-gray-500">
              /{' '}
              {formatProductUnit(
                product.unit,
                product.net_quantity
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
            <div className="mt-4">
              {product.short_description && (
                <p className="text-gray-800 font-medium leading-6">
                  {product.short_description}
                </p>
              )}

              {product.description && (
                <p className="mt-2 text-gray-700 leading-6">
                  {product.description}
                </p>
              )}
            </div>
          )}

          {/* Product details */}
          <dl className="mt-6 space-y-2 text-sm">
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
                product.net_quantity
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

          {/* Ordering */}
          <div className="mt-6">
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
                  className="rounded-full bg-gray-100 text-gray-400 px-6 py-2 text-sm cursor-not-allowed"
                >
                  Unavailable
                </button>

                <p className="mt-2 text-xs text-gray-500">
                  This product is currently unavailable for delivery.
                </p>
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
    <div className="flex justify-between gap-4 border-b border-gray-50 pb-1">
      <dt className="text-gray-500">
        {label}
      </dt>

      <dd className="text-gray-800 text-right">
        {value}
      </dd>
    </div>
  );
}
