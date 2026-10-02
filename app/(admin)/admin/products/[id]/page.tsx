import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { ProductDetailEditor } from '@/components/admin/ProductDetailEditor';

export const dynamic = 'force-dynamic';

const STAFF_ROLES = [
  'admin',
  'sales_manager',
  'inventory_manager',
];

type ProductRow = {
  id: string;
  name: string;
  short_description: string | null;
  description: string | null;
  category_id: string | null;
  sku: string;
  image_url: string | null;
  unit: string;
  net_quantity: number | null;
  selling_price: number;
  mrp: number | null;
  discount_type: 'percentage' | 'fixed' | null;
  discount_value: number;
  available_quantity: number;
  min_stock_level: number;
  min_order_quantity: number;
  max_order_quantity: number | null;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  delivery_available: boolean;
  pickup_available: boolean;
  updated_at: string;
  product_categories: { name: string } | { name: string }[] | null;
};

export default async function AdminProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/auth/login?redirectTo=/admin/products/${encodeURIComponent(params.id)}`
    );
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

  const [productResult, categoriesResult] = await Promise.all([
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
      .eq('id', params.id)
      .single(),

    supabase
      .from('product_categories')
      .select('id, name')
      .order('sort_order', { ascending: true }),
  ]);

  if (productResult.error || !productResult.data) {
    notFound();
  }

  if (categoriesResult.error) {
    throw new Error(
      `Failed to load product categories: ${categoriesResult.error.message}`
    );
  }

  const product = productResult.data as unknown as ProductRow;
  const relation = product.product_categories;
  const categoryName = Array.isArray(relation)
    ? relation[0]?.name ?? null
    : relation?.name ?? null;

  const editorProduct = {
    ...product,
    unit: product.unit as import('@/lib/product-image-path').ProductUnit,
  };

  return (
    <main className="min-w-0 bg-slate-50 pb-10">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <Link
                href="/admin/products"
                className="transition hover:text-slate-900"
              >
                Products
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-slate-700">Product Details</span>
            </div>

            <h1 className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {product.name}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Edit product information, image, pricing, stock and availability.
            </p>
          </div>

          <Link
            href="/admin/products"
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            ← Back to Products
          </Link>
        </div>

        <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard
            label="SKU"
            value={product.sku}
          />
          <SummaryCard
            label="Category"
            value={categoryName ?? 'Uncategorized'}
          />
          <SummaryCard
            label="Stock"
            value={String(product.available_quantity ?? 0)}
          />
          <SummaryCard
            label="Status"
            value={product.is_active ? 'Active' : 'Inactive'}
            tone={product.is_active ? 'positive' : 'muted'}
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:px-6">
            <h2 className="text-base font-bold text-slate-950">
              Product Editor
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Changes are saved through the existing product actions and validation.
            </p>
          </div>

          <ProductDetailEditor
            product={editorProduct}
            categories={categoriesResult.data ?? []}
          />
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'muted';
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 truncate text-sm font-bold ${
          tone === 'positive'
            ? 'text-emerald-700'
            : tone === 'muted'
              ? 'text-slate-500'
              : 'text-slate-950'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
