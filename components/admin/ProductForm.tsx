'use client';

import { useMemo, useState } from 'react';
import { createProduct, updateProduct, deleteProductImageObject } from '@/app/actions/products';
import { PRODUCT_UNITS } from '@/lib/product-image-path';
import { ProductImageUploader } from './ProductImageUploader';

export type ProductCategoryOption = { id: string; name: string };

export type EditableProduct = {
  id: string;
  name: string;
  short_description: string | null;
  description: string | null;
  category_id: string | null;
  sku: string;
  image_url: string | null;
  unit: string;
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
};

function emptyForm(): Omit<EditableProduct, 'id' | 'updated_at'> {
  return {
    name: '',
    short_description: '',
    description: '',
    category_id: null,
    sku: '',
    image_url: null,
    unit: PRODUCT_UNITS[0],
    selling_price: 0,
    mrp: null,
    discount_type: null,
    discount_value: 0,
    available_quantity: 0,
    min_stock_level: 10,
    min_order_quantity: 1,
    max_order_quantity: null,
    is_active: true,
    is_featured: false,
    display_order: 0,
    delivery_available: true,
    pickup_available: false,
  };
}

export function ProductForm({
  categories,
  product,
  onClose,
  onSaved,
}: {
  categories: ProductCategoryOption[];
  product?: EditableProduct;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!product;

  // A new product needs an id up front so the image can be uploaded to
  // products/{id}/... before the product row exists.
  const [draftId] = useState(() => product?.id ?? crypto.randomUUID());
  const [customUnit, setCustomUnit] = useState(
    product && !PRODUCT_UNITS.includes(product.unit as (typeof PRODUCT_UNITS)[number])
  );
  const [form, setForm] = useState(product ? { ...product } : { id: draftId, ...emptyForm() });
  const [pendingImagePath, setPendingImagePath] = useState<string | null>(null);
  const [oldImagePath, setOldImagePath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const savings = useMemo(() => {
    if (!form.mrp || form.mrp <= form.selling_price) return null;
    const amount = form.mrp - form.selling_price;
    const percent = Math.round((amount / form.mrp) * 100);
    return { amount, percent };
  }, [form.mrp, form.selling_price]);

  function handleImageUploaded(url: string, path: string) {
    // If we're replacing an existing image, remember the old storage
    // path so we can delete it only after the save below succeeds.
    if (form.image_url && path) {
      const existingPath = form.image_url.split('/product-images/')[1];
      if (existingPath) setOldImagePath(existingPath);
    }
    update('image_url', url || null);
    setPendingImagePath(path || null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.category_id) {
      setError('Please select a category.');
      return;
    }

    setSaving(true);

    const payload = {
      id: isEdit ? undefined : draftId,
      name: form.name,
      shortDescription: form.short_description,
      description: form.description,
      categoryId: form.category_id,
      sku: form.sku,
      imageUrl: form.image_url,
      unit: form.unit,
      sellingPrice: Number(form.selling_price),
      mrp: form.mrp ? Number(form.mrp) : null,
      discountType: form.discount_type,
      discountValue: Number(form.discount_value) || 0,
      stock: Number(form.available_quantity),
      lowStockThreshold: Number(form.min_stock_level),
      minOrderQuantity: Number(form.min_order_quantity) || 1,
      maxOrderQuantity: form.max_order_quantity ? Number(form.max_order_quantity) : null,
      isActive: form.is_active,
      isFeatured: form.is_featured,
      displayOrder: Number(form.display_order) || 0,
      deliveryAvailable: form.delivery_available,
      pickupAvailable: form.pickup_available,
    };

    const result = isEdit
      ? await updateProduct(product!.id, payload, product!.updated_at)
      : await createProduct(payload);

    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    // Only now that the save has succeeded do we clean up a replaced
    // image — never before (see app/actions/products.ts comment).
    if (oldImagePath) {
      deleteProductImageObject(oldImagePath).catch(() => {});
    }

    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="w-full max-w-2xl bg-white rounded-xl2 shadow-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-8 max-h-[75vh] overflow-y-auto">
          {/* 1. Product Information */}
          <section>
            <h3 className="text-sm font-semibold text-brand-700 mb-3">Product Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Product Name *" span2>
                <input
                  required
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Short Description" span2>
                <input
                  value={form.short_description ?? ''}
                  onChange={(e) => update('short_description', e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Full Description" span2>
                <textarea
                  value={form.description ?? ''}
                  onChange={(e) => update('description', e.target.value)}
                  rows={3}
                  className="input"
                />
              </Field>
              <Field label="Category *">
                <select
                  required
                  value={form.category_id ?? ''}
                  onChange={(e) => update('category_id', e.target.value)}
                  className="input"
                >
                  <option value="" disabled>
                    Select category
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="SKU *">
                <input
                  required
                  value={form.sku}
                  onChange={(e) => update('sku', e.target.value)}
                  className="input"
                />
              </Field>
            </div>
          </section>

          {/* 2. Product Image */}
          <section>
            <h3 className="text-sm font-semibold text-brand-700 mb-3">Product Image</h3>
            <ProductImageUploader
              productId={draftId}
              currentImageUrl={form.image_url}
              onUploaded={handleImageUploaded}
            />
          </section>

          {/* 3. Pricing */}
          <section>
            <h3 className="text-sm font-semibold text-brand-700 mb-3">Pricing</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Selling Price (₹) *">
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  required
                  value={form.selling_price}
                  onChange={(e) => update('selling_price', Number(e.target.value) as never)}
                  className="input"
                />
              </Field>
              <Field label="MRP (₹)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.mrp ?? ''}
                  onChange={(e) => update('mrp', (e.target.value ? Number(e.target.value) : null) as never)}
                  className="input"
                />
              </Field>
              <Field label="Discount Type">
                <select
                  value={form.discount_type ?? ''}
                  onChange={(e) => update('discount_type', (e.target.value || null) as never)}
                  className="input"
                >
                  <option value="">None</option>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </Field>
              <Field label="Discount Value">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.discount_value}
                  onChange={(e) => update('discount_value', Number(e.target.value) as never)}
                  className="input"
                />
              </Field>
            </div>
            {savings && (
              <p className="text-sm text-green-700 mt-2">
                You save ₹{savings.amount.toFixed(2)} ({savings.percent}% OFF)
              </p>
            )}
          </section>

          {/* 4. Inventory */}
          <section>
            <h3 className="text-sm font-semibold text-brand-700 mb-3">Inventory</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Current Stock *">
                <input
                  type="number"
                  min={0}
                  required
                  value={form.available_quantity}
                  onChange={(e) => update('available_quantity', Number(e.target.value) as never)}
                  className="input"
                />
              </Field>
              <Field label="Low Stock Threshold">
                <input
                  type="number"
                  min={0}
                  value={form.min_stock_level}
                  onChange={(e) => update('min_stock_level', Number(e.target.value) as never)}
                  className="input"
                />
              </Field>
              <Field label="Unit *">
                {customUnit ? (
                  <div className="flex gap-2">
                    <input
                      required
                      value={form.unit}
                      onChange={(e) => update('unit', e.target.value)}
                      className="input"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomUnit(false)}
                      className="text-xs text-brand-700 whitespace-nowrap"
                    >
                      Use list
                    </button>
                  </div>
                ) : (
                  <select
                    required
                    value={form.unit}
                    onChange={(e) => {
                      if (e.target.value === '__custom') {
                        setCustomUnit(true);
                        update('unit', '');
                      } else {
                        update('unit', e.target.value);
                      }
                    }}
                    className="input"
                  >
                    {PRODUCT_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                    <option value="__custom">Custom…</option>
                  </select>
                )}
              </Field>
              <Field label="Minimum Order Qty">
                <input
                  type="number"
                  min={1}
                  value={form.min_order_quantity}
                  onChange={(e) => update('min_order_quantity', Number(e.target.value) as never)}
                  className="input"
                />
              </Field>
              <Field label="Maximum Order Qty">
                <input
                  type="number"
                  min={1}
                  value={form.max_order_quantity ?? ''}
                  onChange={(e) =>
                    update('max_order_quantity', (e.target.value ? Number(e.target.value) : null) as never)
                  }
                  className="input"
                />
              </Field>
            </div>
          </section>

          {/* 5. Delivery */}
          <section>
            <h3 className="text-sm font-semibold text-brand-700 mb-3">Delivery</h3>
            <div className="flex flex-wrap gap-6">
              <Checkbox
                label="Available for delivery"
                checked={form.delivery_available}
                onChange={(v) => update('delivery_available', v)}
              />
              <Checkbox
                label="Available for pickup"
                checked={form.pickup_available}
                onChange={(v) => update('pickup_available', v)}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Delivery is currently offered across Latur District via the delivery areas
              configured in Admin → Delivery.
            </p>
          </section>

          {/* 6. Availability / Display */}
          <section>
            <h3 className="text-sm font-semibold text-brand-700 mb-3">Availability &amp; Display</h3>
            <div className="flex flex-wrap gap-6 mb-4">
              <Checkbox
                label="Active (visible to customers)"
                checked={form.is_active}
                onChange={(v) => update('is_active', v)}
              />
              <Checkbox
                label="Featured product"
                checked={form.is_featured}
                onChange={(v) => update('is_featured', v)}
              />
            </div>
            <Field label="Display Order (lower shows first)">
              <input
                type="number"
                value={form.display_order}
                onChange={(e) => update('display_order', Number(e.target.value) as never)}
                className="input max-w-[8rem]"
              />
            </Field>
          </section>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-300 px-5 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-brand-600 text-white px-5 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

function Field({ label, span2, children }: { label: string; span2?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block text-sm font-medium text-gray-700 ${span2 ? 'col-span-2' : ''}`}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
