'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteProduct,
  duplicateProduct,
  toggleProductStatus,
} from '@/app/actions/products';
import { ProductForm, type EditableProduct, type ProductCategoryOption } from './ProductForm';
import { getProductDemand } from '@/app/actions/product-demand';
import { AdminPageHeader } from './AdminPageHeader';
import AdminBreadcrumbs from './AdminBreadcrumbs';

type Row = EditableProduct & { category_name: string | null };

type StatusFilter =
  | 'all'
  | 'active'
  | 'inactive'
  | 'low_stock'
  | 'out_of_stock'
  | 'featured'
  | 'high_demand'
  | 'low_demand';

type DemandRow = {
  product_id: string;
  quantity: number;
  order_count: number;
};

export function ProductsManager({
  initialProducts,
  categories,
}: {
  initialProducts: Row[];
  categories: ProductCategoryOption[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [demandRows, setDemandRows] = useState<DemandRow[]>([]);
  const [demandLoading, setDemandLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | undefined>(undefined);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const productListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDemand() {
      setDemandLoading(true);
      const result = await getProductDemand(30);

      if (!cancelled) {
        setDemandRows(result.rows ?? []);
        setDemandLoading(false);
      }
    }

    void loadDemand();

    return () => {
      cancelled = true;
    };
  }, []);

  const demandMap = useMemo(
    () => new Map(demandRows.map((row) => [row.product_id, row])),
    [demandRows]
  );

  const demandRanked = useMemo(() => {
    return initialProducts
      .map((product) => ({
        product,
        demand: demandMap.get(product.id) ?? {
          product_id: product.id,
          quantity: 0,
          order_count: 0,
        },
      }))
      .sort((a, b) => {
        if (b.demand.quantity !== a.demand.quantity) {
          return b.demand.quantity - a.demand.quantity;
        }
        return b.demand.order_count - a.demand.order_count;
      });
  }, [initialProducts, demandMap]);

  const highDemand = demandRanked.slice(0, 5);
  const lowDemand = [...demandRanked]
    .sort((a, b) => {
      if (a.demand.quantity !== b.demand.quantity) {
        return a.demand.quantity - b.demand.quantity;
      }
      return a.demand.order_count - b.demand.order_count;
    })
    .slice(0, 5);

  const stats = useMemo(() => {
    const total = initialProducts.length;
    const active = initialProducts.filter((p) => p.is_active).length;
    const lowStock = initialProducts.filter(
      (p) => p.available_quantity > 0 && p.available_quantity <= p.min_stock_level
    ).length;
    const outOfStock = initialProducts.filter((p) => p.available_quantity <= 0).length;

    return {
      total,
      active,
      inactive: total - active,
      lowStock,
      outOfStock,
    };
  }, [initialProducts]);

  const filtered = useMemo(() => {
    return initialProducts.filter((p) => {
      if (search && !`${p.name} ${p.sku}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== 'all' && p.category_id !== categoryFilter) return false;
      switch (statusFilter) {
        case 'active':
          return p.is_active;
        case 'inactive':
          return !p.is_active;
        case 'low_stock':
          return p.available_quantity > 0 && p.available_quantity <= p.min_stock_level;
        case 'out_of_stock':
          return p.available_quantity <= 0;
        case 'featured':
          return p.is_featured;
        case 'high_demand':
          return highDemand.some((item) => item.product.id === p.id);
        case 'low_demand':
          return lowDemand.some((item) => item.product.id === p.id);
        default:
          return true;
      }
    });
  }, [initialProducts, search, statusFilter, categoryFilter]);

  function scrollToProductList() {
    requestAnimationFrame(() => {
      productListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function selectFilter(filter: StatusFilter) {
    setSearch('');
    setCategoryFilter('all');
    setStatusFilter(filter);
    scrollToProductList();
  }

  function openProductDetails(product: Row) {
    router.push(`/admin/products/${product.id}`);
  }

  function stockLabel(p: Row) {
    if (p.available_quantity <= 0) return { text: 'Out of Stock', color: 'text-red-600 bg-red-50' };
    if (p.available_quantity <= p.min_stock_level) return { text: 'Low Stock', color: 'text-amber-600 bg-amber-50' };
    return { text: 'In Stock', color: 'text-green-700 bg-green-50' };
  }

  function finalPrice(p: Row) {
    return p.selling_price;
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleToggle(p: Row) {
    setBusyId(p.id);
    const result = await toggleProductStatus(p.id, !p.is_active);
    setBusyId(null);
    if (result.error) {
      showToast(result.error);
      return;
    }
    showToast(p.is_active ? 'Product deactivated.' : 'Product activated.');
    router.refresh();
  }

  async function handleDuplicate(p: Row) {
    setBusyId(p.id);
    const result = await duplicateProduct(p.id);
    setBusyId(null);
    if (result.error) {
      showToast(result.error);
      return;
    }
    showToast('Product duplicated as a draft — edit it to activate.');
    router.refresh();
  }

  async function handleDeleteConfirmed() {
    if (!confirmDelete) return;
    setBusyId(confirmDelete.id);
    const result = await deleteProduct(confirmDelete.id);
    setBusyId(null);
    setConfirmDelete(null);
    if (result.error) {
      showToast(result.error);
      return;
    }
    showToast('Product deleted.');
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:py-8">
      <AdminBreadcrumbs />

      <AdminPageHeader
        title="Products"
        description="Manage your dairy catalog, pricing, stock visibility, demand insights, and product status."
      >
        <button
          type="button"
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
          className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
        >
          + Add Product
        </button>
      </AdminPageHeader>

      {/* Interactive catalog KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Total Products"
          value={stats.total}
          active={statusFilter === 'all'}
          onClick={() => selectFilter('all')}
        />
        <StatCard
          label="Active"
          value={stats.active}
          tone="green"
          active={statusFilter === 'active'}
          onClick={() => selectFilter('active')}
        />
        <StatCard
          label="Inactive"
          value={stats.inactive}
          active={statusFilter === 'inactive'}
          onClick={() => selectFilter('inactive')}
        />
        <StatCard
          label="Low Stock"
          value={stats.lowStock}
          tone="amber"
          active={statusFilter === 'low_stock'}
          onClick={() => selectFilter('low_stock')}
        />
        <StatCard
          label="Out of Stock"
          value={stats.outOfStock}
          tone="red"
          active={statusFilter === 'out_of_stock'}
          onClick={() => selectFilter('out_of_stock')}
        />
      </div>

      {/* Demand KPIs */}
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <StatCard
          label="High Demand — Top 5"
          value={highDemand.length}
          tone="green"
          active={statusFilter === 'high_demand'}
          onClick={() => selectFilter('high_demand')}
          description="Highest units ordered in last 30 days"
        />
        <StatCard
          label="Low Demand — Bottom 5"
          value={lowDemand.length}
          tone="amber"
          active={statusFilter === 'low_demand'}
          onClick={() => selectFilter('low_demand')}
          description="Lowest units ordered in last 30 days"
        />
      </div>

      {/* Demand insights */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Product Demand</h2>
            <p className="text-sm text-slate-500">
              Based on ordered quantities from valid orders in the last 30 days.
            </p>
          </div>
          {demandLoading ? (
            <span className="text-xs font-medium text-slate-400">Loading demand…</span>
          ) : (
            <span className="text-xs font-medium text-slate-400">
              {demandRows.reduce((sum, row) => sum + row.quantity, 0)} units ordered
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DemandPanel
            title="High Demand"
            subtitle="Products customers ordered most"
            rows={highDemand}
            tone="green"
            onSelect={() => selectFilter('high_demand')}
            onProductSelect={openProductDetails}
          />
          <DemandPanel
            title="Low Demand"
            subtitle="Products with the fewest orders"
            rows={lowDemand}
            tone="amber"
            onSelect={() => selectFilter('low_demand')}
            onProductSelect={openProductDetails}
          />
        </div>
      </section>

      {/* Product results */}
      <section ref={productListRef} className="mt-8 scroll-mt-24">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {statusFilter === 'all' ? 'All Products' :
               statusFilter === 'active' ? 'Active Products' :
               statusFilter === 'inactive' ? 'Inactive Products' :
               statusFilter === 'low_stock' ? 'Low Stock Products' :
               statusFilter === 'out_of_stock' ? 'Out of Stock Products' :
               statusFilter === 'featured' ? 'Featured Products' :
               statusFilter === 'high_demand' ? 'High Demand Products' : 'Low Demand Products'}
            </h2>
            <p className="text-sm text-slate-500">{filtered.length} product{filtered.length === 1 ? '' : 's'} shown</p>
          </div>
          {statusFilter !== 'all' || search || categoryFilter !== 'all' ? (
            <button type="button" onClick={() => selectFilter('all')} className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Show all products
            </button>
          ) : null}
        </div>

        {/* Search + filters */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
              ⌕
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name or SKU…"
              aria-label="Search products by name or SKU"
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter products by category"
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 md:min-w-[210px]"
          >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2" aria-label="Product status filters">
        {(
          [
            ['all', 'All'],
            ['active', 'Active'],
            ['inactive', 'Inactive'],
            ['low_stock', 'Low Stock'],
            ['out_of_stock', 'Out of Stock'],
            ['featured', 'Featured'],
            ['high_demand', 'High Demand'],
            ['low_demand', 'Low Demand'],
          ] as [StatusFilter, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => selectFilter(value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium border ${
              statusFilter === value
                ? 'bg-brand-600 text-white border-brand-600'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl" aria-hidden="true">
            🥛
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">No products found</h3>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
            Try changing the search or filters, or add a new product to your catalog.
          </p>
          {(search || categoryFilter !== 'all' || statusFilter !== 'all') ? (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCategoryFilter('all');
                setStatusFilter('all');
              }}
              className="mt-4 inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Image</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Featured</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const stock = stockLabel(p);
                  return (
                    <tr key={p.id} className="border-t border-slate-100 transition hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => openProductDetails(p)} className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200" aria-label={`Open details for ${p.name}`}>
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100" />
                        )}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <button type="button" onClick={() => openProductDetails(p)} className="min-h-[44px] text-left font-medium text-slate-900 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200 rounded-lg px-1 -mx-1" aria-label={`Open details for ${p.name}`}>
                          {p.name}
                          <div className="text-xs text-gray-400 font-normal">{p.sku}</div>
                        </button>
                      </td>
                      <td className="px-4 py-3">{p.category_name ?? '—'}</td>
                      <td className="px-4 py-3 text-right">₹{finalPrice(p).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        {p.available_quantity} {p.unit}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${stock.color}`}>
                          {stock.text}
                        </span>
                        <span
                          className={`ml-1 text-xs font-medium rounded-full px-2 py-0.5 ${
                            p.is_active ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{p.is_featured ? '★' : ''}</td>
                      <td className="px-4 py-3 align-top text-right min-w-[250px]">
                        <RowActions
                          product={p}
                          busy={busyId === p.id}
                          onEdit={() => {
                            setEditing(p);
                            setFormOpen(true);
                          }}
                          onDuplicate={() => handleDuplicate(p)}
                          onToggle={() => handleToggle(p)}
                          onDelete={() => setConfirmDelete(p)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((p) => {
              const stock = stockLabel(p);
              return (
                <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex gap-3">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.category_name ?? '—'}</p>
                    <p className="text-sm mt-1">
                      ₹{finalPrice(p).toFixed(2)} · {p.available_quantity} {p.unit}
                    </p>
                    <div className="flex gap-1 mt-1">
                      <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${stock.color}`}>
                        {stock.text}
                      </span>
                      <span
                        className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                          p.is_active ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="mt-3 w-full">
                      <RowActions
                        product={p}
                        busy={busyId === p.id}
                        onEdit={() => {
                          setEditing(p);
                          setFormOpen(true);
                        }}
                        onDuplicate={() => handleDuplicate(p)}
                        onToggle={() => handleToggle(p)}
                        onDelete={() => setConfirmDelete(p)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      </section>

      {formOpen && (
        <ProductForm
          categories={categories}
          product={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            showToast(editing ? 'Product updated.' : 'Product created.');
            router.refresh();
          }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-product-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 id="delete-product-title" className="text-lg font-semibold text-slate-900">
              Delete &quot;{confirmDelete.name}&quot;?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Are you sure you want to permanently delete this product? This can&apos;t be undone.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="min-h-[48px] rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                disabled={busyId === confirmDelete.id}
                className="min-h-[48px] rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-gray-900 px-4 py-3 text-center text-sm text-white shadow-lg sm:left-auto sm:right-6 sm:max-w-sm sm:rounded-full">
          {toast}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  active,
  onClick,
  description,
}: {
  label: string;
  value: number;
  tone?: 'green' | 'amber' | 'red';
  active?: boolean;
  onClick?: () => void;
  description?: string;
}) {
  const toneClass =
    tone === 'green'
      ? 'text-green-700'
      : tone === 'amber'
      ? 'text-amber-600'
      : tone === 'red'
      ? 'text-red-600'
      : 'text-gray-900';

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        {onClick ? <span className="text-sm text-slate-400">→</span> : null}
      </div>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
      {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
      {active ? (
        <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-red-600">
          Selected
        </p>
      ) : null}
    </>
  );

  if (!onClick) {
    return <div className="rounded-2xl border border-gray-100 bg-white p-4">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[116px] rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        active ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'
      }`}
    >
      {content}
    </button>
  );
}

function DemandPanel({
  title,
  subtitle,
  rows,
  tone,
  onSelect,
  onProductSelect,
}: {
  title: string;
  subtitle: string;
  rows: Array<{
    product: Row;
    demand: DemandRow;
  }>;
  tone: 'green' | 'amber';
  onSelect: () => void;
  onProductSelect: (product: Row) => void;
}) {
  const badgeClass =
    tone === 'green'
      ? 'bg-green-50 text-green-700'
      : 'bg-amber-50 text-amber-700';

  return (
    <div className="rounded-xl2 border border-slate-200 bg-slate-50/60 p-3">
      <button
        type="button"
        onClick={onSelect}
        className="flex min-h-[48px] w-full items-center justify-between rounded-xl px-2 text-left hover:bg-white"
      >
        <span>
          <span className="block text-sm font-semibold text-slate-900">{title}</span>
          <span className="block text-xs text-slate-500">{subtitle}</span>
        </span>
        <span className="text-sm font-semibold text-slate-400">View all →</span>
      </button>

      <div className="mt-2 divide-y divide-slate-200 rounded-xl bg-white">
        {rows.map(({ product, demand }, index) => (
          <button
            type="button"
            key={product.id}
            onClick={() => onProductSelect(product)}
            className="flex min-h-[58px] w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50"
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badgeClass}`}>
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-900">
                {product.name}
              </span>
              <span className="block text-xs text-slate-400">
                {product.sku} · {demand.order_count} order{demand.order_count === 1 ? '' : 's'}
              </span>
            </span>
            <span className="shrink-0 text-sm font-bold text-slate-900">
              {demand.quantity} units
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RowActions({
  product,
  busy,
  onEdit,
  onDuplicate,
  onToggle,
  onDelete,
}: {
  product: Row;
  busy: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const base =
    'inline-flex min-h-[44px] items-center justify-center rounded-xl border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-1';

  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
      <button
        type="button"
        onClick={onEdit}
        disabled={busy}
        aria-label={`Edit ${product.name}`}
        className={`${base} border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 focus:ring-blue-300`}
      >
        Edit
      </button>
      <button
        type="button"
        onClick={onDuplicate}
        disabled={busy}
        aria-label={`Duplicate ${product.name}`}
        className={`${base} border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-300`}
      >
        Duplicate
      </button>
      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        aria-label={product.is_active ? `Deactivate ${product.name}` : `Activate ${product.name}`}
        className={`${base} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 focus:ring-amber-300`}
      >
        {product.is_active ? 'Deactivate' : 'Activate'}
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        aria-label={`Delete ${product.name}`}
        className={`${base} border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-300`}
      >
        Delete
      </button>
    </div>
  );
}
