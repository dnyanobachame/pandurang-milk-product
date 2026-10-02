import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import { ProductsManager } from '@/components/admin/ProductsManager';

const STAFF_ROLES = [
  'admin',
  'sales_manager',
  'inventory_manager',
];

export default async function AdminProductsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      '/auth/login?redirectTo=/admin/products'
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (
    profileError ||
    !profile ||
    !STAFF_ROLES.includes(profile.role)
  ) {
    redirect('/dashboard');
  }

  const [
    productsResult,
    categoriesResult,
  ] = await Promise.all([
    supabase
      .from('products')
      .select(
        `
          id,
          name,
          short_description,
          description,
          category_id,
          sku,
          image_url,
          unit,
          net_quantity,
          selling_price,
          mrp,
          discount_type,
          discount_value,
          available_quantity,
          min_stock_level,
          min_order_quantity,
          max_order_quantity,
          is_active,
          is_featured,
          display_order,
          delivery_available,
          pickup_available,
          updated_at,
          product_categories (
            name
          )
        `
      )
      .order('display_order', {
        ascending: true,
      }),

    supabase
      .from('product_categories')
      .select('id, name')
      .order('sort_order', {
        ascending: true,
      }),
  ]);

  if (productsResult.error) {
    throw new Error(
      `Failed to load products: ${productsResult.error.message}`
    );
  }

  if (categoriesResult.error) {
    throw new Error(
      `Failed to load categories: ${categoriesResult.error.message}`
    );
  }

  const rows =
    (productsResult.data ?? []).map(
      (product) => ({
        ...product,

        category_name:
          (
            product as unknown as {
              product_categories:
                | {
                    name: string;
                  }
                | null;
            }
          ).product_categories?.name ?? null,
      })
    );

  return (
    <ProductsManager
      initialProducts={
        rows as never
      }
      categories={
        categoriesResult.data ?? []
      }
    />
  );
}