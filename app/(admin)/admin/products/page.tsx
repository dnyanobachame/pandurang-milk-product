import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProductsManager } from '@/components/admin/ProductsManager';

const STAFF_ROLES = ['admin', 'sales_manager', 'inventory_manager'];

export default async function AdminProductsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirectTo=/admin/products');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  // Belt-and-braces: middleware already blocks non-staff from /admin/*,
  // but this page also checks directly rather than relying on that alone.
  if (!profile || !STAFF_ROLES.includes(profile.role)) {
    redirect('/dashboard');
  }

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from('products')
      .select(
        `id, name, short_description, description, category_id, sku, image_url, unit,
         selling_price, mrp, discount_type, discount_value, available_quantity,
         min_stock_level, min_order_quantity, max_order_quantity, is_active, is_featured,
         display_order, delivery_available, pickup_available, updated_at,
         product_categories ( name )`
      )
      .order('display_order', { ascending: true }),
    supabase.from('product_categories').select('id, name').order('sort_order', { ascending: true }),
  ]);

  const rows = (products ?? []).map((p) => ({
    ...p,
    category_name: (p as unknown as { product_categories: { name: string } | null }).product_categories?.name ?? null,
  }));

  return <ProductsManager initialProducts={rows as never} categories={categories ?? []} />;
}
