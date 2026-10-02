'use client';

import { useMemo, useState } from 'react';

import {
  createProduct,
  updateProduct,
  deleteProductImageObject,
  type ProductFormInput,
} from '@/app/actions/products';

import {
  PRODUCT_UNITS,
  type ProductUnit,
} from '@/lib/product-image-path';

import { ProductImageUploader } from './ProductImageUploader';

export type ProductCategoryOption = {
  id: string;
  name: string;
};

export type EditableProduct = {
  id: string;
  name: string;
  short_description: string | null;
  description: string | null;
  category_id: string | null;
  sku: string;
  image_url: string | null;

  net_quantity: number | null;
  unit: ProductUnit;

  selling_price: number;
  mrp: number | null;

  discount_type:
    | 'percentage'
    | 'fixed'
    | null;

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

type ProductFormState = {
  id?: string;

  name: string;
  short_description: string;
  description: string;
  category_id: string | null;
  sku: string;
  image_url: string | null;

  net_quantity: number | null;
  unit: ProductUnit;

  selling_price: number;
  mrp: number | null;

  discount_type:
    | 'percentage'
    | 'fixed'
    | null;

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

  updated_at?: string;
};

function emptyForm(): Omit<
  ProductFormState,
  'id' | 'updated_at'
> {
  return {
    name: '',
    short_description: '',
    description: '',
    category_id: null,
    sku: '',
    image_url: null,

    net_quantity: 1,
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
  const isEdit = Boolean(product);

  const [draftId] = useState(
    () => product?.id ?? crypto.randomUUID()
  );

  const [form, setForm] = useState<ProductFormState>(
    product
      ? {
          id: product.id,
          name: product.name,
          short_description:
            product.short_description ?? '',
          description:
            product.description ?? '',
          category_id:
            product.category_id,
          sku: product.sku,
          image_url:
            product.image_url,

          net_quantity:
            product.net_quantity ?? 1,

          unit: product.unit,

          selling_price:
            product.selling_price,

          mrp:
            product.mrp,

          discount_type:
            product.discount_type,

          discount_value:
            product.discount_value,

          available_quantity:
            product.available_quantity,

          min_stock_level:
            product.min_stock_level,

          min_order_quantity:
            product.min_order_quantity,

          max_order_quantity:
            product.max_order_quantity,

          is_active:
            product.is_active,

          is_featured:
            product.is_featured,

          display_order:
            product.display_order,

          delivery_available:
            product.delivery_available,

          pickup_available:
            product.pickup_available,

          updated_at:
            product.updated_at,
        }
      : {
          id: draftId,
          ...emptyForm(),
        }
  );

  const [pendingImagePath, setPendingImagePath] =
    useState<string | null>(null);

  const [oldImagePath, setOldImagePath] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [saving, setSaving] =
    useState(false);

  function update<K extends keyof ProductFormState>(
    key: K,
    value: ProductFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  const savings = useMemo(() => {
    const mrp = Number(form.mrp);
    const sellingPrice = Number(
      form.selling_price
    );

    if (
      !Number.isFinite(mrp) ||
      !Number.isFinite(sellingPrice) ||
      mrp <= sellingPrice ||
      mrp <= 0
    ) {
      return null;
    }

    const amount =
      mrp - sellingPrice;

    const percent = Math.round(
      (amount / mrp) * 100
    );

    return {
      amount,
      percent,
    };
  }, [
    form.mrp,
    form.selling_price,
  ]);

  function handleImageUploaded(
    url: string,
    path: string
  ) {
    if (form.image_url && path) {
      const existingPath =
        form.image_url.split(
          '/product-images/'
        )[1];

      if (existingPath) {
        setOldImagePath(existingPath);
      }
    }

    update(
      'image_url',
      url || null
    );

    setPendingImagePath(
      path || null
    );
  }

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError(null);

    const name =
      form.name.trim();

    const sku =
      form.sku.trim();

    const unit =
      form.unit.trim() as ProductUnit;

    const netQuantity =
      Number(form.net_quantity);

    const stock =
      Number(form.available_quantity);

    const lowStockThreshold =
      Number(form.min_stock_level);

    const sellingPrice =
      Number(form.selling_price);

    const minOrderQuantity =
      Number(form.min_order_quantity);

    const maxOrderQuantity =
      form.max_order_quantity === null ||
      form.max_order_quantity === undefined ||
      String(
        form.max_order_quantity
      ).trim() === ''
        ? null
        : Number(
            form.max_order_quantity
          );

    const mrp =
      form.mrp === null ||
      form.mrp === undefined ||
      String(form.mrp).trim() === ''
        ? null
        : Number(form.mrp);

    if (!form.category_id) {
      setError(
        'Please select a category.'
      );
      return;
    }

    if (!name) {
      setError(
        'Product name is required.'
      );
      return;
    }

    if (!sku) {
      setError(
        'SKU is required.'
      );
      return;
    }

    if (
      !Number.isFinite(netQuantity) ||
      netQuantity <= 0
    ) {
      setError(
        'Package quantity must be greater than 0.'
      );
      return;
    }

    if (!unit) {
      setError(
        'Please select a unit.'
      );
      return;
    }

    if (
      !PRODUCT_UNITS.includes(unit)
    ) {
      setError(
        'Please select a valid package unit.'
      );
      return;
    }

    if (
      !Number.isFinite(stock) ||
      stock < 0
    ) {
      setError(
        'Stock cannot be negative.'
      );
      return;
    }

    if (!Number.isInteger(stock)) {
      setError(
        'Stock must be a whole number of packages.'
      );
      return;
    }

    if (
      !Number.isFinite(
        lowStockThreshold
      ) ||
      lowStockThreshold < 0
    ) {
      setError(
        'Low stock threshold cannot be negative.'
      );
      return;
    }

    if (
      !Number.isInteger(
        lowStockThreshold
      )
    ) {
      setError(
        'Low stock threshold must be a whole number.'
      );
      return;
    }

    if (
      !Number.isFinite(
        sellingPrice
      ) ||
      sellingPrice <= 0
    ) {
      setError(
        'Selling price must be greater than 0.'
      );
      return;
    }

    if (
      mrp !== null &&
      (!Number.isFinite(mrp) ||
        mrp <= 0)
    ) {
      setError(
        'Please enter a valid MRP.'
      );
      return;
    }

    if (
      mrp !== null &&
      mrp < sellingPrice
    ) {
      setError(
        'MRP must be greater than or equal to the selling price.'
      );
      return;
    }

    if (
      !Number.isFinite(
        minOrderQuantity
      ) ||
      minOrderQuantity < 1 ||
      !Number.isInteger(
        minOrderQuantity
      )
    ) {
      setError(
        'Minimum order quantity must be a whole number of packages.'
      );
      return;
    }

    if (
      maxOrderQuantity !== null &&
      (!Number.isFinite(
        maxOrderQuantity
      ) ||
        maxOrderQuantity <
          minOrderQuantity ||
        !Number.isInteger(
          maxOrderQuantity
        ))
    ) {
      setError(
        'Maximum order quantity must be a whole number and at least the minimum order quantity.'
      );
      return;
    }

    setSaving(true);

    const payload: ProductFormInput = {
      id: isEdit
        ? undefined
        : draftId,

      name,

      shortDescription:
        form.short_description.trim() ||
        '',

      description:
        form.description.trim() ||
        '',

      categoryId:
        form.category_id,

      sku,

      imageUrl:
        form.image_url,

      netQuantity,

      unit,

      sellingPrice,

      mrp,

      discountType:
        form.discount_type,

      discountValue:
        Number(
          form.discount_value
        ) || 0,

      stock,

      lowStockThreshold,

      minOrderQuantity,

      maxOrderQuantity,

      isActive:
        Boolean(form.is_active),

      isFeatured:
        Boolean(form.is_featured),

      displayOrder:
        Number(
          form.display_order
        ) || 0,

      deliveryAvailable:
        Boolean(
          form.delivery_available
        ),

      pickupAvailable:
        Boolean(
          form.pickup_available
        ),
    };

    try {
      const result = isEdit
        ? await updateProduct(
            product!.id,
            payload,
            product!.updated_at
          )
        : await createProduct(
            payload
          );

      if (result.error) {
        setError(result.error);
        return;
      }

      if (oldImagePath) {
        deleteProductImageObject(
          oldImagePath
        ).catch((imageError) => {
          console.error(
            'OLD PRODUCT IMAGE DELETE ERROR:',
            imageError
          );
        });
      }

      onSaved();
    } catch (actionError) {
      console.error(
        'PRODUCT SAVE ERROR:',
        actionError
      );

      setError(
        'Something went wrong while saving the product. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-4 backdrop-blur-[2px] sm:py-6">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-950">
              {isEdit
                ? 'Edit Product'
                : 'Add Product'}
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Manage product details, package size,
              price and stock.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(100vh-7rem)] space-y-8 overflow-y-auto px-5 py-6 sm:max-h-[calc(100vh-7.5rem)] sm:px-6"
        >
          {/* PRODUCT INFORMATION */}
          <section>
            <SectionTitle>
              Product Information
            </SectionTitle>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Product Name *"
                span2
              >
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    update(
                      'name',
                      e.target.value
                    )
                  }
                  className="input"
                  placeholder="Example: Desi Cow Milk"
                />
              </Field>

              <Field
                label="Short Description"
                span2
              >
                <input
                  value={
                    form.short_description
                  }
                  onChange={(e) =>
                    update(
                      'short_description',
                      e.target.value
                    )
                  }
                  className="input"
                  placeholder="Short product description"
                />
              </Field>

              <Field
                label="Full Description"
                span2
              >
                <textarea
                  value={
                    form.description
                  }
                  onChange={(e) =>
                    update(
                      'description',
                      e.target.value
                    )
                  }
                  rows={3}
                  className="input"
                  placeholder="Full product description"
                />
              </Field>

              <Field label="Category *">
                <select
                  required
                  value={
                    form.category_id ?? ''
                  }
                  onChange={(e) =>
                    update(
                      'category_id',
                      e.target.value
                    )
                  }
                  className="input"
                >
                  <option
                    value=""
                    disabled
                  >
                    Select category
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={
                          category.id
                        }
                      >
                        {category.name}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field label="SKU *">
                <input
                  required
                  value={form.sku}
                  onChange={(e) =>
                    update(
                      'sku',
                      e.target.value
                    )
                  }
                  className="input"
                  placeholder="Example: COW-MILK-1L"
                />
              </Field>
            </div>
          </section>

          {/* IMAGE */}
          <section>
            <SectionTitle>
              Product Image
            </SectionTitle>

            <ProductImageUploader
              productId={draftId}
              currentImageUrl={
                form.image_url
              }
              onUploaded={
                handleImageUploaded
              }
            />

            {pendingImagePath && (
              <p className="mt-2 text-xs text-green-600">
                New image uploaded. Save the
                product to apply it.
              </p>
            )}
          </section>

          {/* PACKAGE */}
          <section>
            <SectionTitle>
              Package &amp; Stock
            </SectionTitle>

            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-sm font-semibold text-blue-900">
                Package size and stock are separate
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-700">
                Example: 1,500 units in stock,
                with each unit containing 500 ml.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Package Quantity *">
                <input
                  type="number"
                  min={0.001}
                  step="0.001"
                  required
                  value={
                    form.net_quantity ?? ''
                  }
                  onChange={(e) =>
                    update(
                      'net_quantity',
                      e.target.value
                        ? Number(
                            e.target.value
                          )
                        : null
                    )
                  }
                  className="input"
                  placeholder="Example: 500"
                />

                <p className="helper">
                  Example: 500 for 500 ml,
                  250 for 250 g, 1 for 1 kg.
                </p>
              </Field>

              <Field label="Unit *">
                <select
                  required
                  value={form.unit}
                  onChange={(e) =>
                    update(
                      'unit',
                      e.target
                        .value as ProductUnit
                    )
                  }
                  className="input"
                >
                  {PRODUCT_UNITS.map(
                    (unit) => (
                      <option
                        key={unit}
                        value={unit}
                      >
                        {unit}
                      </option>
                    )
                  )}
                </select>

                <p className="helper">
                  Stored separately from package
                  quantity.
                </p>
              </Field>

              <Field label="Current Stock *">
                <input
                  type="number"
                  min={0}
                  step="1"
                  required
                  value={
                    form.available_quantity
                  }
                  onChange={(e) =>
                    update(
                      'available_quantity',
                      Number(
                        e.target.value
                      )
                    )
                  }
                  className="input"
                />

                <p className="helper">
                  Number of complete packages
                  available for sale.
                </p>
              </Field>

              <Field label="Low Stock Threshold">
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={
                    form.min_stock_level
                  }
                  onChange={(e) =>
                    update(
                      'min_stock_level',
                      Number(
                        e.target.value
                      )
                    )
                  }
                  className="input"
                />
              </Field>

              <Field label="Minimum Order Qty">
                <input
                  type="number"
                  min={1}
                  step="1"
                  value={
                    form.min_order_quantity
                  }
                  onChange={(e) =>
                    update(
                      'min_order_quantity',
                      Number(
                        e.target.value
                      )
                    )
                  }
                  className="input"
                />
              </Field>

              <Field label="Maximum Order Qty">
                <input
                  type="number"
                  min={1}
                  step="1"
                  value={
                    form.max_order_quantity ??
                    ''
                  }
                  onChange={(e) =>
                    update(
                      'max_order_quantity',
                      e.target.value
                        ? Number(
                            e.target.value
                          )
                        : null
                    )
                  }
                  className="input"
                />

                <p className="helper">
                  Leave empty for no maximum.
                </p>
              </Field>
            </div>
          </section>

          {/* PRICING */}
          <section>
            <SectionTitle>
              Pricing
            </SectionTitle>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Selling Price (₹) *">
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  required
                  value={
                    form.selling_price
                  }
                  onChange={(e) =>
                    update(
                      'selling_price',
                      Number(
                        e.target.value
                      )
                    )
                  }
                  className="input"
                />
              </Field>

              <Field label="MRP (₹)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={
                    form.mrp ?? ''
                  }
                  onChange={(e) =>
                    update(
                      'mrp',
                      e.target.value
                        ? Number(
                            e.target.value
                          )
                        : null
                    )
                  }
                  className="input"
                />
              </Field>

              <Field label="Discount Type">
                <select
                  value={
                    form.discount_type ??
                    ''
                  }
                  onChange={(e) =>
                    update(
                      'discount_type',
                      (e.target.value ||
                        null) as
                        | 'percentage'
                        | 'fixed'
                        | null
                    )
                  }
                  className="input"
                >
                  <option value="">
                    None
                  </option>

                  <option value="percentage">
                    Percentage
                  </option>

                  <option value="fixed">
                    Fixed amount
                  </option>
                </select>
              </Field>

              <Field label="Discount Value">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  disabled={!form.discount_type}
                  value={
                    form.discount_value
                  }
                  onChange={(e) =>
                    update(
                      'discount_value',
                      Number(
                        e.target.value
                      )
                    )
                  }
                  className="input disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  placeholder={
                    form.discount_type
                      ? form.discount_type === 'percentage'
                        ? 'Example: 10'
                        : 'Example: 20'
                      : 'Select discount type first'
                  }
                />
                <p className="helper">
                  {form.discount_type === 'percentage'
                    ? 'Enter a percentage from 0 to 100.'
                    : form.discount_type === 'fixed'
                      ? 'Enter the discount amount in rupees.'
                      : 'Optional. Select a discount type to enable this field.'}
                </p>
              </Field>
            </div>

            {savings && (
              <div className="mt-3 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                Customer saves ₹
                {savings.amount.toFixed(2)}
                {' '}
                ({savings.percent}% OFF)
              </div>
            )}
          </section>

          {/* DELIVERY */}
          <section>
            <SectionTitle>
              Delivery
            </SectionTitle>

            <div className="flex flex-wrap gap-6">
              <Checkbox
                label="Available for delivery"
                checked={
                  form.delivery_available
                }
                onChange={(value) =>
                  update(
                    'delivery_available',
                    value
                  )
                }
              />

              <Checkbox
                label="Available for pickup"
                checked={
                  form.pickup_available
                }
                onChange={(value) =>
                  update(
                    'pickup_available',
                    value
                  )
                }
              />
            </div>

            <p className="helper mt-2">
              Delivery availability is controlled
              by the configured delivery areas.
            </p>
          </section>

          {/* DISPLAY */}
          <section>
            <SectionTitle>
              Availability &amp; Display
            </SectionTitle>

            <div className="mb-4 flex flex-wrap gap-6">
              <Checkbox
                label="Active (visible to customers)"
                checked={
                  form.is_active
                }
                onChange={(value) =>
                  update(
                    'is_active',
                    value
                  )
                }
              />

              <Checkbox
                label="Featured product"
                checked={
                  form.is_featured
                }
                onChange={(value) =>
                  update(
                    'is_featured',
                    value
                  )
                }
              />
            </div>

            <Field label="Display Order">
              <input
                type="number"
                step="1"
                value={
                  form.display_order
                }
                onChange={(e) =>
                  update(
                    'display_order',
                    Number(
                      e.target.value
                    )
                  )
                }
                className="input max-w-[10rem]"
              />

              <p className="helper">
                Lower numbers appear first where
                display order is used.
              </p>
            </Field>
          </section>

          {/* ERROR */}
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
            >
              {error}
            </div>
          )}

          {/* ACTIONS */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="min-h-[44px] rounded-xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? 'Saving…'
                : isEdit
                  ? 'Save Changes'
                  : 'Save Product'}
            </button>
          </div>
        </form>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          min-height: 42px;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          background: white;
        }

        .input:focus {
          outline: none;
          border-color: #0f172a;
          box-shadow:
            0 0 0 2px
            rgba(15, 23, 42, 0.08);
        }

        textarea.input {
          resize: vertical;
        }

        .helper {
          margin-top: 0.25rem;
          font-size: 0.75rem;
          line-height: 1.25rem;
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}

function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <h3 className="mb-4 text-sm font-semibold text-slate-700">
      {children}
    </h3>
  );
}

function Field({
  label,
  span2,
  children,
}: {
  label: string;
  span2?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`block text-sm font-medium text-gray-700 ${
        span2
          ? 'sm:col-span-2'
          : ''
      }`}
    >
      {label}

      <div className="mt-1.5">
        {children}
      </div>
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
  onChange: (
    value: boolean
  ) => void;
}) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) =>
          onChange(
            e.target.checked
          )
        }
        className="h-4 w-4"
      />

      {label}
    </label>
  );
}