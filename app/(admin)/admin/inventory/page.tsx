import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { InventoryAdjustmentForm } from '@/components/inventory/InventoryAdjustmentForm';
import { OfflineSaleForm } from '@/components/inventory/OfflineSaleForm';

export const dynamic = 'force-dynamic';

type StockRow = {
  id: string;
  product_id: string;
  product_name: string;
  packaging_batch_number: string | null;
  expiry_date: string | null;
  current_stock: number | string | null;
  unit: string | null;
  batch_id: string | null;
};

type LowStockRow = {
  id: string;
  name: string;
  available_quantity: number | string | null;
  min_stock_level: number | string | null;
};

type NearExpiryRow = {
  id: string;
  packaging_batch_number: string | null;
  product_name: string;
  quantity_packed: number | string | null;
  expiry_date: string | null;
};

function numberValue(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function stockState(current: number, minimum: number) {
  if (current <= 0) {
    return {
      label: 'Out of stock',
      className: 'bg-red-100 text-red-700',
    };
  }

  if (current <= minimum) {
    return {
      label: 'Low stock',
      className: 'bg-amber-100 text-amber-700',
    };
  }

  return {
    label: 'In stock',
    className: 'bg-emerald-100 text-emerald-700',
  };
}

type InventoryView = 'all' | 'low' | 'out' | 'expiry';

export default async function InventoryPage({
  searchParams,
}: {
  searchParams?: { view?: string };
}) {
  const supabase = createClient();

  const requestedView = searchParams?.view;
  const selectedView: InventoryView =
    requestedView === 'low' ||
    requestedView === 'out' ||
    requestedView === 'expiry'
      ? requestedView
      : 'all';

  const [
    { data: stockData },
    { data: lowStockData },
    { data: nearExpiryData },
  ] = await Promise.all([
    supabase
      .from('current_stock')
      .select('*')
      .order('product_name')
      .limit(100),
    supabase.from('low_stock_products').select('*'),
    supabase
      .from('near_expiry_batches')
      .select('*')
      .order('expiry_date'),
  ]);

  const stock = (stockData ?? []) as StockRow[];
  const lowStock = (lowStockData ?? []) as LowStockRow[];
  const nearExpiry = (nearExpiryData ?? []) as NearExpiryRow[];

  const lowStockIds = new Set(lowStock.map((item) => item.id));
  const lowStockNames = new Set(lowStock.map((item) => item.name));

  const outOfStockCount = stock.filter(
    (row) => numberValue(row.current_stock) <= 0,
  ).length;

  const lowStockCount = stock.filter((row) => {
    const current = numberValue(row.current_stock);
    const lowItem = lowStock.find(
      (item) => item.id === row.product_id || item.name === row.product_name,
    );

    return (
      current > 0 &&
      (lowItem
        ? current <= numberValue(lowItem.min_stock_level)
        : lowStockIds.has(row.product_id) || lowStockNames.has(row.product_name))
    );
  }).length;

  const healthyStockCount = Math.max(
    stock.length - outOfStockCount - lowStockCount,
    0,
  );

  const totalUnits = stock.reduce(
    (sum, row) => sum + numberValue(row.current_stock),
    0,
  );

  const visibleStock =
    selectedView === 'low'
      ? stock.filter((row) => {
          const current = numberValue(row.current_stock);
          const lowItem = lowStock.find(
            (item) => item.id === row.product_id || item.name === row.product_name,
          );
          const minimum = numberValue(lowItem?.min_stock_level);

          return (
            current > 0 &&
            (lowItem
              ? current <= minimum
              : lowStockIds.has(row.product_id) ||
                lowStockNames.has(row.product_name))
          );
        })
      : selectedView === 'out'
        ? stock.filter((row) => numberValue(row.current_stock) <= 0)
        : stock;

  const viewTitle =
    selectedView === 'low'
      ? 'Low Stock Products'
      : selectedView === 'out'
        ? 'Out of Stock Products'
        : selectedView === 'expiry'
          ? 'Near Expiry / Expired Batches'
          : 'Current Stock';

  const viewDescription =
    selectedView === 'low'
      ? 'Products currently below their minimum stock level.'
      : selectedView === 'out'
        ? 'Products with zero current stock.'
        : selectedView === 'expiry'
          ? 'Batches approaching or past their expiry date.'
          : 'All current inventory stock lines.';

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            Fulfilment
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Inventory
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Monitor current stock, low-stock products, expiry risk, and make controlled inventory adjustments.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Stock Lines
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {stock.length}
          </p>
        </div>
      </div>

      {/* Summary filters */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/admin/inventory"
          className={`block min-h-32 rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
            selectedView === 'all'
              ? 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <p className="text-sm font-medium text-slate-500">Total Stock</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalUnits}</p>
          <p className="mt-1 text-xs text-slate-500">Tap to view all stock lines →</p>
        </Link>

        <Link
          href="/admin/inventory?view=low"
          className={`block min-h-32 rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-500 ${
            selectedView === 'low'
              ? 'border-amber-300 bg-amber-100 ring-1 ring-amber-200'
              : 'border-amber-200 bg-amber-50 hover:border-amber-300'
          }`}
        >
          <p className="text-sm font-medium text-amber-700">Low Stock</p>
          <p className="mt-2 text-3xl font-bold text-amber-900">{lowStock.length}</p>
          <p className="mt-1 text-xs text-amber-700">Tap to view low-stock products →</p>
        </Link>

        <Link
          href="/admin/inventory?view=out"
          className={`block min-h-32 rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 ${
            selectedView === 'out'
              ? 'border-red-300 bg-red-100 ring-1 ring-red-200'
              : 'border-red-200 bg-red-50 hover:border-red-300'
          }`}
        >
          <p className="text-sm font-medium text-red-700">Out of Stock</p>
          <p className="mt-2 text-3xl font-bold text-red-900">{outOfStockCount}</p>
          <p className="mt-1 text-xs text-red-700">Tap to view unavailable products →</p>
        </Link>

        <Link
          href="/admin/inventory?view=expiry"
          className={`block min-h-32 rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
            selectedView === 'expiry'
              ? 'border-orange-300 bg-orange-100 ring-1 ring-orange-200'
              : 'border-orange-200 bg-orange-50 hover:border-orange-300'
          }`}
        >
          <p className="text-sm font-medium text-orange-700">Near Expiry</p>
          <p className="mt-2 text-3xl font-bold text-orange-900">{nearExpiry.length}</p>
          <p className="mt-1 text-xs text-orange-700">Tap to view affected batches →</p>
        </Link>
      </div>

      {/* Active filter */}
      {selectedView !== 'all' && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Showing: {selectedView === 'low'
                ? 'Low Stock'
                : selectedView === 'out'
                  ? 'Out of Stock'
                  : 'Near Expiry / Expired'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Tap another summary box to change the inventory view.
            </p>
          </div>
          <Link
            href="/admin/inventory"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Show All
          </Link>
        </div>
      )}

      {/* Related data for Near Expiry */}
      {selectedView === 'expiry' && (
        <section className="overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm">
          <div className="border-b border-orange-100 bg-orange-50 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-orange-900">
                  Near Expiry / Expired Batches
                </h2>
                <p className="mt-1 text-sm text-orange-700">
                  Batches approaching or past their expiry date.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-orange-800">
                {nearExpiry.length}
              </span>
            </div>
          </div>

          {nearExpiry.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {nearExpiry.map((batch) => (
                <details key={batch.id} className="group">
                  <summary className="list-none cursor-pointer px-5 py-4 transition hover:bg-orange-50/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500 sm:px-6 [&::-webkit-details-marker]:hidden">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {batch.product_name}
                        </p>
                        <p className="mt-1 font-mono text-xs text-slate-500">
                          {batch.packaging_batch_number || 'Batch not available'}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="text-left sm:text-right">
                          <p className="text-sm font-semibold text-orange-700">
                            {batch.quantity_packed ?? 0} units
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Expires {formatDate(batch.expiry_date)}
                          </p>
                        </div>
                        <span className="text-lg text-slate-400 transition group-open:rotate-180">⌄</span>
                      </div>
                    </div>
                  </summary>

                  <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Product</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{batch.product_name}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Batch</p>
                        <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-900">
                          {batch.packaging_batch_number || '—'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Expiry</p>
                        <p className="mt-1 text-sm font-semibold text-red-700">
                          {formatDate(batch.expiry_date)}
                        </p>
                      </div>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              No near-expiry batches found.
            </div>
          )}
        </section>
      )}

      {/* Related data for Low Stock */}
      {selectedView === 'low' && (
        <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
          <div className="border-b border-amber-100 bg-amber-50 px-5 py-4 sm:px-6">
            <h2 className="font-semibold text-amber-900">Low Stock Products</h2>
            <p className="mt-1 text-sm text-amber-700">
              Products currently below their minimum stock level.
            </p>
          </div>

          {lowStock.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {lowStock.map((product) => (
                <Link
                  key={product.id}
                  href={`/admin/products/${product.id}`}
                  className="flex min-h-16 items-center justify-between gap-4 px-5 py-4 transition hover:bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500 sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Minimum level: {numberValue(product.min_stock_level)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-amber-800">
                      {numberValue(product.available_quantity)} left
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Open product →</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              No low-stock products found.
            </div>
          )}
        </section>
      )}

      {/* Related data for Out of Stock */}
      {selectedView === 'out' && (
        <section className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
          <div className="border-b border-red-100 bg-red-50 px-5 py-4 sm:px-6">
            <h2 className="font-semibold text-red-900">Out of Stock Products</h2>
            <p className="mt-1 text-sm text-red-700">
              Current stock is zero for these inventory lines.
            </p>
          </div>

          {visibleStock.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {visibleStock.map((row) => (
                <Link
                  key={row.id}
                  href={`/admin/products/${row.product_id}`}
                  className="flex min-h-16 items-center justify-between gap-4 px-5 py-4 transition hover:bg-red-50/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500 sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{row.product_name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {row.packaging_batch_number || 'No batch linked'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-red-700">0 {row.unit || 'units'}</p>
                    <p className="mt-1 text-xs text-slate-400">Open product →</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              No out-of-stock products found.
            </div>
          )}
        </section>
      )}

      {/* Current Stock */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{viewTitle}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {viewDescription}
              </p>
            </div>
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {visibleStock.length} stock lines
            </span>
          </div>
        </div>

        {visibleStock.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {visibleStock.map((row) => {
              const current = numberValue(row.current_stock);
              const lowItem = lowStock.find(
                (item) => item.id === row.product_id || item.name === row.product_name,
              );
              const minimum = numberValue(lowItem?.min_stock_level);
              const state = stockState(current, minimum);

              return (
                <details key={row.id} className="group">
                  <summary className="list-none cursor-pointer px-5 py-4 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:px-6 [&::-webkit-details-marker]:hidden">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
                          {row.product_name.slice(0, 1).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {row.product_name}
                            </p>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${state.className}`}>
                              {state.label}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-slate-500">
                            {row.packaging_batch_number
                              ? `${row.packaging_batch_number} · expires ${formatDate(row.expiry_date)}`
                              : 'No packaging batch linked'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 lg:justify-end">
                        <div className="text-left lg:text-right">
                          <p className="text-lg font-bold text-slate-900">
                            {current} {row.unit || 'units'}
                          </p>
                          <p className="text-xs text-slate-500">Current stock</p>
                        </div>
                        <span className="text-lg text-slate-400 transition group-open:rotate-180">⌄</span>
                      </div>
                    </div>
                  </summary>

                  <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Stock</p>
                        <p className="mt-1 text-lg font-bold text-slate-900">
                          {current} {row.unit || 'units'}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Batch</p>
                        <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-900">
                          {row.packaging_batch_number || '—'}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Expiry</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {formatDate(row.expiry_date)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <Link
                        href={`/admin/products/${row.product_id}`}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        View Product Details →
                      </Link>

                      <div className="grid gap-3 lg:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Inventory Adjustment
                          </p>
                          <InventoryAdjustmentForm
                            productId={row.product_id}
                            batchId={row.batch_id}
                            productName={row.product_name}
                          />
                        </div>

                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                            Offline Sale
                          </p>
                          <OfflineSaleForm
                            productId={row.product_id}
                            batchId={row.batch_id}
                            productName={row.product_name}
                            unit={row.unit}
                            currentStock={current}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              —
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              No matching inventory found
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Try another summary box or return to the full inventory view.
            </p>
          </div>
        )}
      </section>

      {/* Stock health */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">Stock health</p>
            <p className="mt-1 text-sm text-slate-500">
              {healthyStockCount} healthy · {lowStockCount} low · {outOfStockCount} out of stock
            </p>
          </div>
          <Link
            href="/admin/products"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Manage Products →
          </Link>
        </div>
      </section>
    </div>
  );
}
