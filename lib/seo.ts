import type { Metadata } from 'next';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  'https://pandurangmilk.in';

export const SITE_NAME = 'Pandurang Milk Product';

export const DEFAULT_TITLE =
  'Pandurang Milk Product | Fresh Milk & Dairy Products in Latur District';

export const DEFAULT_DESCRIPTION =
  'Shop fresh milk, cow milk, buffalo milk, paneer, curd, ghee and other dairy products from Pandurang Milk Product with delivery in selected areas of Latur District, Maharashtra.';

export const BUSINESS_NAME = 'Pandurang Milk Product';

export const BUSINESS_PHONE = '+91-7028591828';

export const BUSINESS_EMAIL = 'milkpandurang@gmail.com';

export const BUSINESS_ADDRESS =
  'Village Aanandwadi (Gaur), Latur District, Maharashtra, India';

export const DEFAULT_OG_IMAGE = '/logo.png';

export const DEFAULT_KEYWORDS = [
  'milk in Latur',
  'fresh milk in Latur',
  'milk products in Latur',
  'dairy products in Latur',
  'milk delivery in Latur',
  'buy milk online Latur',
  'fresh cow milk Latur',
  'cow milk in Latur',
  'buffalo milk Latur',
  'paneer in Latur',
  'fresh paneer Latur',
  'curd in Latur',
  'ghee in Latur',
  'dairy products near me',
  'online milk delivery Latur',
  'order milk online Latur',
  'order paneer online Latur',
  'Pandurang Milk Product',
];

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return new URL(
    path.startsWith('/') ? path : `/${path}`,
    SITE_URL
  ).toString();
}

export function createPageMetadata({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  keywords = DEFAULT_KEYWORDS,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  keywords?: string[];
}): Metadata {
  const url = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'en_IN',
      type: 'website',
      images: [
        {
          url: imageUrl,
          alt: `${SITE_NAME} - Fresh dairy products`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}
