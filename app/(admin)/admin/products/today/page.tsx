import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TodayProductsManager } from '@/components/admin/TodayProductsManager';

const STAFF_ROLES = [
  'admin',
  'sales_manager',
  'inventory_manager',
];

export default async function TodayProductsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      '/auth/login?redirectTo=/admin/products/today'
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (
    !profile ||
    !STAFF_ROLES.includes(profile.role)
  ) {
    redirect('/dashboard');
  }

  const [
    { data: activeProducts, error: productsError },
    { data: selectedRows, error: selectedError },
  ] = await Promise.all([
    supabase
      .from('products')
      .select(
        `
        id,
        name,
        name_marathi,
        sku,
        image_url,
        selling_price,
        mrp,
        unit,
        available_quantity,
        is_active
        `
      )
      .eq('is_active', true)
      .order('name', {
        ascending: true,
      }),

    supabase
      .from('today_products')
      .select(
        'product_id, display_order'
      )
      .order('display_order', {
        ascending: true,
      }),
  ]);

  if (productsError) {
    throw new Error(
      `Failed to load products: ${productsError.message}`
    );
  }

  if (selectedError) {
    throw new Error(
      `Failed to load Today's Products: ${selectedError.message}`
    );
  }

  const productMap = new Map(
    (activeProducts ?? []).map((product) => [
      product.id,
      product,
    ])
  );

  const selectedProducts = (selectedRows ?? [])
    .map((row) => {
      const product =
        productMap.get(row.product_id);

      if (!product) {
        return null;
      }

      return {
        ...product,
        display_order: row.display_order,
      };
    })
    .filter(
      (
        product
      ): product is NonNullable<typeof product> =>
        product !== null
    );

  const activeCount = activeProducts?.length ?? 0;
  const selectedCount = selectedProducts.length;
  const availableTodayCount = selectedProducts.filter(
    (product) => Number(product.available_quantity ?? 0) > 0
  ).length;
  const outOfStockCount = selectedProducts.filter(
    (product) => Number(product.available_quantity ?? 0) <= 0
  ).length;

  return (
    <main className="min-w-0 bg-slate-50 px-4 py-5 pb-8 md:px-8 md:py-7">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/admin/products"
                  className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 active:scale-[0.99]"
                >
                  ← Products
                </Link>
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                  Daily Catalog
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                Today&apos;s Products
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
                Choose and arrange the products that should appear in today&apos;s
                customer catalog.
              </p>
            </div>

            <Link
              href="/admin/products"
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99] sm:w-auto"
            >
              Manage Products
            </Link>
          </div>
        </header>

        <section
          aria-label="Today's product statistics"
          className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4"
        >
          <StatCard
            label="Today&apos;s Products"
            value={selectedCount}
            hint="Currently selected"
            href="#today-products-manager"
          />
          <StatCard
            label="Active Products"
            value={activeCount}
            hint="Available to select"
            href="/admin/products"
          />
          <StatCard
            label="Available Today"
            value={availableTodayCount}
            hint="Selected products in stock"
            href="#today-products-manager"
          />
          <StatCard
            label="Out of Stock"
            value={outOfStockCount}
            hint="Selected products with no stock"
            href="#today-products-manager"
          />
        </section>

        <section
          id="today-products-manager"
          className="mt-5 scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-5"
        >
          <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold text-slate-900">
                  Daily Catalog Manager
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Add products from the active catalog and arrange their display order.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                {selectedCount} selected
              </span>
            </div>
          </div>

          <TodayProductsManager
            activeProducts={activeProducts ?? []}
            selectedProducts={selectedProducts}
          />
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number;
  hint: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group min-h-[126px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:scale-[0.99] md:p-5"
      aria-label={`${label}: ${value}. ${hint}`}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {label}
          </span>
          <span className="text-slate-300 transition group-hover:text-red-500">
            ↗
          </span>
        </div>
        <div>
          <p className="mt-3 text-2xl font-bold text-slate-950 md:text-3xl">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {hint}
          </p>
        </div>
      </div>
    </Link>
  );
}
