import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.example';

/** Next.js reads this at /sitemap.xml. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();
  const { data: products } = await supabase.from('products').select('id, updated_at').eq('is_active', true);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/products`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/refund-policy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/shipping-policy`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const productEntries: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `${SITE_URL}/products/${p.id}`,
    changeFrequency: 'weekly',
    priority: 0.7,
    lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
  }));

  return [...staticEntries, ...productEntries];
}
