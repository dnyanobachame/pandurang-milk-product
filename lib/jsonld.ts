import {
  absoluteUrl,
  BUSINESS_ADDRESS,
  BUSINESS_EMAIL,
  BUSINESS_NAME,
  BUSINESS_PHONE,
  SITE_NAME,
  SITE_URL,
} from '@/lib/seo';

import { isProductAvailable } from '@/lib/seo-data';

type ProductForJsonLd = {
  id: string;
  name: string;
  name_marathi?: string | null;
  sku?: string | null;
  product_code?: string | null;
  description?: string | null;
  short_description?: string | null;
  image_url?: string | null;
  selling_price: number;
  mrp?: number | null;
  available_quantity: number;
  delivery_available: boolean;
  is_active: boolean;
  unit: string;
  net_quantity?: number | null;
  product_categories?: {
    id: string;
    name: string;
    name_marathi: string | null;
  } | null;
};

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BUSINESS_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/logo.png'),
    telephone: BUSINESS_PHONE,
    email: BUSINESS_EMAIL,
  };
}

export function localBusinessJsonLd(
  deliveryAreas: {
    district: string;
    city_or_village: string;
    pin_code: string | null;
  }[]
) {
  const areaNames = Array.from(
    new Set(
      deliveryAreas
        .map((area) => area.city_or_village)
        .filter(Boolean)
    )
  );

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: BUSINESS_NAME,
    url: SITE_URL,
    telephone: BUSINESS_PHONE,
    email: BUSINESS_EMAIL,
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS_ADDRESS,
      addressLocality: 'Latur',
      addressRegion: 'Maharashtra',
      addressCountry: 'IN',
    },
    areaServed: areaNames.map((name) => ({
      '@type': 'City',
      name,
    })),
  };
}

export function productJsonLd(product: ProductForJsonLd) {
  const available = isProductAvailable(product);

  const description =
    product.short_description ||
    product.description ||
    `${product.name} from ${SITE_NAME}.`;

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description,
    url: `${SITE_URL}/products/${product.id}`,
  };

  if (product.image_url) {
    data.image = [product.image_url];
  }

  if (product.sku || product.product_code) {
    data.sku = product.sku || product.product_code;
  }

  data.brand = {
    '@type': 'Brand',
    name: BUSINESS_NAME,
  };

  if (product.product_categories?.name) {
    data.category = product.product_categories.name;
  }

  data.offers = {
    '@type': 'Offer',
    url: `${SITE_URL}/products/${product.id}`,
    priceCurrency: 'INR',
    price: product.selling_price.toFixed(2),
    availability: available
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
  };

  return data;
}

export function breadcrumbJsonLd(
  items: {
    name: string;
    url: string;
  }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
