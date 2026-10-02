import Link from 'next/link';
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
    redirect('/auth/login?redirectTo=/admin/products');
  }

  const { data: profile, error: profileError } = await supabase
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

  const [productsResult, categoriesResult] = await Promise.all([
    supabase
      .from('products')
      .select(`
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
        product_categories (name)
      `)
      .order('display_order', { ascending: true }),

    supabase
      .from('product_categories')
      .select('id, name')
      .order('sort_order', { ascending: true }),
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

  const rows = (productsResult.data ?? []).map((product) => ({
    ...product,
    category_name:
      (
        product as unknown as {
          product_categories:
            | { name: string }
            | null;
        }
      ).product_categories?.name ?? null,
  }));

  const totalProducts = rows.length;
  const activeProducts = rows.filter((product) => product.is_active).length;
  const inactiveProducts = totalProducts - activeProducts;
  const outOfStockProducts = rows.filter(
    (product) => Number(product.available_quantity ?? 0) <= 0
  ).length;
  const lowStockProducts = rows.filter((product) => {
    const stock = Number(product.available_quantity ?? 0);
    const minimum = Number(product.min_stock_level ?? 0);
    return stock > 0 && stock <= minimum;
  }).length;
  const featuredProducts = rows.filter((product) => product.is_featured).length;

  return (
    <main className="min-w-0 bg-slate-50 pb-8">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-red-600">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Products
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Manage products, pricing, stock thresholds, availability and catalog visibility.
            </p>
          </div>

          <Link
            href="/admin/products?add=true"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.99]"
          >
            + Add Product
          </Link>
        </div>

        <section
          aria-label="Product statistics"
          className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        >
          <ProductStat label="Total Products" value={totalProducts} />
          <ProductStat label="Active" value={activeProducts} />
          <ProductStat label="Inactive" value={inactiveProducts} />
          <ProductStat label="Out of Stock" value={outOfStockProducts} />
          <ProductStat label="Low Stock" value={lowStockProducts} />
          <ProductStat label="Featured" value={featuredProducts} />
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-base font-bold text-slate-950">Product Catalog</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Select a product to edit it or open its full details.
              </p>
            </div>
            <Link
              href="/admin/products/today"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:bg-slate-100"
            >
              Today's Products →
            </Link>
          </div>

          <div className="p-1 sm:p-2">
            <ProductsManager
              initialProducts={rows as never}
              categories={categoriesResult.data ?? []}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function ProductStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-h-[104px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}
