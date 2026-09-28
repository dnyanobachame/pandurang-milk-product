import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import {
  BUSINESS_ADDRESS,
  BUSINESS_EMAIL,
  BUSINESS_NAME,
  BUSINESS_PHONE,
  SITE_URL,
} from '@/lib/seo';

export const getSeoBusinessData = cache(async () => {
  const supabase = createClient();

  const [{ data: company }, { data: deliveryAreas }] =
    await Promise.all([
      supabase
        .from('company_settings')
        .select(
          'company_name, tagline, phone, email, address'
        )
        .limit(1)
        .maybeSingle(),

      supabase
        .from('delivery_areas')
        .select(
          'district, city_or_village, pin_code, is_active'
        )
        .eq('is_active', true)
        .order('city_or_village'),
    ]);

  return {
    companyName: company?.company_name || BUSINESS_NAME,
    tagline: company?.tagline || 'Fresh. Pure. Trusted.',
    phone: company?.phone || BUSINESS_PHONE,
    email: company?.email || BUSINESS_EMAIL,
    address: company?.address || BUSINESS_ADDRESS,
    deliveryAreas: deliveryAreas ?? [],
  };
});

export const getPublicProduct = cache(async (id: string) => {
  const supabase = createClient();

  const { data } = await supabase
    .from('products')
    .select(
      `
      id,
      name,
      name_marathi,
      category_id,
      sku,
      product_code,
      description,
      short_description,
      image_url,
      unit,
      net_quantity,
      selling_price,
      mrp,
      available_quantity,
      min_stock_level,
      shelf_life_days,
      is_active,
      delivery_available,
      storage_requirements,
      slug,
      product_categories (
        id,
        name,
        name_marathi
      )
    `
    )
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (!data) {
    return data;
  }

  return {
    ...data,
    product_categories: data.product_categories?.[0] ?? null,
  };
});

export function getProductUrl(product: {
  id: string;
}): string {
  return `${SITE_URL}/products/${product.id}`;
}

export function isProductAvailable(product: {
  is_active: boolean;
  delivery_available: boolean;
  available_quantity: number;
}): boolean {
  return (
    product.is_active &&
    product.delivery_available &&
    product.available_quantity > 0
  );
}
