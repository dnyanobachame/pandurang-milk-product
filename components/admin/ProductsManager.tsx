'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteProduct,
  duplicateProduct,
  toggleProductStatus,
} from '@/app/actions/products';
import { ProductForm, type EditableProduct, type ProductCategoryOption } from './ProductForm';

type Row = EditableProduct & { category_name: string | null };

type StatusFilter = 'all' | 'active' | 'inactive' | 'low_stock' | 'out_of_stock' | 'featured';

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
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | undefined>(undefined);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = initialProducts.length;
    const active = initialProducts.filter((p) => p.is_active).length;
    const lowStock = initialProducts.filter(
      (p) => p.available_quantity > 0 && p.available_quantity <= p.min_stock_level
    ).length;
    const outOfStock = initialProducts.filter((p) => p.available_quantity <= 0).length;
    return { total, active, inactive: total - active, lowStock, outOfStock };
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
        default:
          return true;
      }
    });
  }, [initialProducts, search, statusFilter, categoryFilter]);

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
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h1 className="text-2xl font-semibold">Products</h1>
        <button
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
          className="rounded-full bg-brand-600 text-white px-5 py-2 text-sm font-medium hover:bg-brand-700"
        >
          + Add Product
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total Products" value={stats.total} />
        <StatCard label="Active" value={stats.active} tone="green" />
        <StatCard label="Inactive" value={stats.inactive} />
        <StatCard label="Low Stock" value={stats.lowStock} tone="amber" />
        <StatCard label="Out of Stock" value={stats.outOfStock} tone="red" />
      </div>

      {/* Search + filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or SKU…"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(
          [
            ['all', 'All'],
            ['active', 'Active'],
            ['inactive', 'Inactive'],
            ['low_stock', 'Low Stock'],
            ['out_of_stock', 'Out of Stock'],
            ['featured', 'Featured'],
          ] as [StatusFilter, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
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

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 py-12 text-center">No products found.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl2 border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
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
                    <tr key={p.id} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {p.name}
                        <div className="text-xs text-gray-400 font-normal">{p.sku}</div>
                      </td>
                      <td className="px-4 py-3">{p.category_name ?? '—'}</td>
                      <td className="px-4 py-3 text-right">₹{finalPrice(p).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        {p.available_quantity} × {p.unit}
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
                      <td className="px-4 py-3 text-right whitespace-nowrap">
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
                <div key={p.id} className="rounded-xl2 border border-gray-100 p-4 flex gap-3">
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
                      ₹{finalPrice(p).toFixed(2)} · {p.available_quantity} × {p.unit}
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
                    <div className="mt-2">
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
          <div className="w-full max-w-sm bg-white rounded-xl2 p-6">
            <p className="font-medium mb-2">Delete &quot;{confirmDelete.name}&quot;?</p>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to permanently delete this product? This can&apos;t be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmed}
                className="rounded-full bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm rounded-full px-4 py-2 shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: 'green' | 'amber' | 'red' }) {
  const toneClass =
    tone === 'green'
      ? 'text-green-700'
      : tone === 'amber'
      ? 'text-amber-600'
      : tone === 'red'
      ? 'text-red-600'
      : 'text-gray-900';
  return (
    <div className="rounded-xl2 border border-gray-100 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-semibold ${toneClass}`}>{value}</p>
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
  return (
    <div className="inline-flex flex-wrap gap-2 justify-end">
      <button onClick={onEdit} disabled={busy} className="text-brand-700 text-xs font-medium hover:underline">
        Edit
      </button>
      <button onClick={onDuplicate} disabled={busy} className="text-gray-500 text-xs font-medium hover:underline">
        Duplicate
      </button>
      <button onClick={onToggle} disabled={busy} className="text-gray-500 text-xs font-medium hover:underline">
        {product.is_active ? 'Deactivate' : 'Activate'}
      </button>
      <button onClick={onDelete} disabled={busy} className="text-red-600 text-xs font-medium hover:underline">
        Delete
      </button>
    </div>
  );
}

