'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  addTodayProduct,
  removeTodayProduct,
  reorderTodayProducts,
} from '@/app/actions/products';

type Product = {
  id: string;
  name: string;
  name_marathi: string | null;
  sku: string;
  image_url: string | null;
  selling_price: number;
  mrp: number;
  unit: string;
  available_quantity: number;
  is_active: boolean;
};

type SelectedProduct = Product & {
  display_order: number;
};

export function TodayProductsManager({
  activeProducts,
  selectedProducts: initialSelectedProducts,
}: {
  activeProducts: Product[];
  selectedProducts: SelectedProduct[];
}) {
  const router = useRouter();

  const [selectedProducts, setSelectedProducts] =
    useState<SelectedProduct[]>(initialSelectedProducts);

  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const selectedIds = useMemo(
    () => new Set(selectedProducts.map((product) => product.id)),
    [selectedProducts]
  );

  const availableProducts = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return activeProducts.filter((product) => {
      if (selectedIds.has(product.id)) {
        return false;
      }

      if (!searchText) {
        return true;
      }

      return `${product.name} ${product.name_marathi ?? ''} ${product.sku}`
        .toLowerCase()
        .includes(searchText);
    });
  }, [activeProducts, selectedIds, search]);

  function showToast(message: string) {
    setToast(message);

    setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  async function handleAdd(product: Product) {
    if (busyId || savingOrder) return;

    setBusyId(product.id);

    try {
      const result = await addTodayProduct(product.id);

      if (result.error) {
        showToast(result.error);
        return;
      }

      showToast(`${product.name} added to Today's Products.`);
      router.refresh();
    } catch (error) {
      console.error('ADD TODAY PRODUCT ERROR:', error);
      showToast('Unable to add the product.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(product: SelectedProduct) {
    if (busyId || savingOrder) return;

    setBusyId(product.id);

    try {
      const result = await removeTodayProduct(product.id);

      if (result.error) {
        showToast(result.error);
        return;
      }

      setSelectedProducts((current) =>
        current
          .filter((item) => item.id !== product.id)
          .map((item, index) => ({
            ...item,
            display_order: index,
          }))
      );

      setDirty(false);

      showToast(`${product.name} removed from Today's Products.`);
      router.refresh();
    } catch (error) {
      console.error('REMOVE TODAY PRODUCT ERROR:', error);
      showToast('Unable to remove the product.');
    } finally {
      setBusyId(null);
    }
  }

  function moveProduct(fromIndex: number, toIndex: number) {
    if (
      toIndex < 0 ||
      toIndex >= selectedProducts.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const next = [...selectedProducts];
    const [moved] = next.splice(fromIndex, 1);

    next.splice(toIndex, 0, moved);

    setSelectedProducts(
      next.map((item, index) => ({
        ...item,
        display_order: index,
      }))
    );

    setDirty(true);
  }

  function handleDragStart(productId: string) {
    if (savingOrder || busyId) return;
    setDraggedId(productId);
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
  }

  function handleDrop(targetId: string) {
    if (
      !draggedId ||
      draggedId === targetId ||
      savingOrder ||
      busyId
    ) {
      setDraggedId(null);
      return;
    }

    const fromIndex = selectedProducts.findIndex(
      (item) => item.id === draggedId
    );

    const toIndex = selectedProducts.findIndex(
      (item) => item.id === targetId
    );

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedId(null);
      return;
    }

    moveProduct(fromIndex, toIndex);
    setDraggedId(null);
  }

  async function handleSaveOrder() {
    if (!dirty || savingOrder || busyId) return;

    setSavingOrder(true);

    try {
      const result = await reorderTodayProducts(
        selectedProducts.map((product) => product.id)
      );

      if (result.error) {
        showToast(result.error);
        return;
      }

      setDirty(false);
      showToast("Today's Products order saved.");
      router.refresh();
    } catch (error) {
      console.error('REORDER TODAY PRODUCTS ERROR:', error);
      showToast('Unable to save product order.');
    } finally {
      setSavingOrder(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 md:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex min-h-9 items-center text-sm font-semibold text-brand-700 transition hover:text-brand-800 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-2"
          >
            ← Back to Products
          </Link>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Today&apos;s Products
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Choose which products appear on the public
            homepage under &quot;Today&apos;s Products&quot;
            and control their display order.
          </p>
        </div>

        <div
          aria-label={`${selectedProducts.length} products selected for homepage`}
          className="w-full rounded-2xl border border-brand-100 bg-brand-50 px-5 py-4 sm:w-auto sm:min-w-[180px]"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            Selected
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {selectedProducts.length}
          </p>

          <p className="text-xs text-slate-500">
            products on homepage
          </p>
        </div>
      </div>

      {/* Info */}
      <div
        role="note"
        className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5"
      >
        <p className="font-semibold text-blue-900">
          How this works
        </p>

        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-blue-800">
          <li>
            Add any active product to Today&apos;s Products.
          </li>
          <li>
            Drag products to choose first, second, third,
            and so on.
          </li>
          <li>
            Use the ↑ / ↓ buttons on mobile or when
            drag-and-drop is inconvenient.
          </li>
          <li>
            Removing a product here does not delete it
            from your catalog.
          </li>
          <li>
            Deactivating a product removes it from the
            public homepage automatically.
          </li>
        </ul>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Available products */}
        <section
          aria-labelledby="available-products-title"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <h2
              id="available-products-title"
              className="text-lg font-semibold text-slate-900"
            >
              Available Products
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Active catalog products not already selected.
            </p>

            <div className="relative mt-4">
              <label
                htmlFor="today-products-search"
                className="sr-only"
              >
                Search available products
              </label>

              <input
                id="today-products-search"
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search product or SKU..."
                autoComplete="off"
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <div className="max-h-[650px] overflow-y-auto p-4">
            {availableProducts.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-8 text-center">
                <div
                  aria-hidden="true"
                  className="text-3xl"
                >
                  📦
                </div>

                <p className="mt-3 font-medium text-slate-700">
                  No products available.
                </p>

                <p className="mt-1 text-sm leading-5 text-slate-500">
                  All active products may already be
                  selected, or no products match your
                  search.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableProducts.map((product) => {
                  const isBusy = busyId === product.id;

                  return (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 transition hover:border-slate-200 hover:shadow-sm"
                    >
                      <ProductImage product={product} />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {product.name}
                        </p>

                        {product.name_marathi && (
                          <p className="truncate text-xs text-slate-500">
                            {product.name_marathi}
                          </p>
                        )}

                        <p className="mt-1 truncate text-xs text-slate-400">
                          {product.sku}
                          {' · '}
                          ₹{product.selling_price.toFixed(2)}
                          {' · '}
                          {product.available_quantity}{' '}
                          {product.unit}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAdd(product)}
                        disabled={!!busyId || savingOrder}
                        aria-busy={isBusy}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isBusy ? (
                          <>
                            <span
                              aria-hidden="true"
                              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                            />
                            Adding…
                          </>
                        ) : (
                          '+ Add'
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Selected */}
        <section
          aria-labelledby="homepage-order-title"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2
                id="homepage-order-title"
                className="text-lg font-semibold text-slate-900"
              >
                Homepage Order
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                First item appears first on the homepage.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveOrder}
              disabled={
                savingOrder ||
                !dirty ||
                !!busyId
              }
              aria-busy={savingOrder}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              {savingOrder ? (
                <>
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  />
                  Saving…
                </>
              ) : dirty ? (
                'Save Order'
              ) : (
                'Order Saved'
              )}
            </button>
          </div>

          <div className="p-4 sm:p-5">
            {selectedProducts.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-10 text-center">
                <div
                  aria-hidden="true"
                  className="text-4xl"
                >
                  📦
                </div>

                <p className="mt-3 font-medium text-slate-700">
                  No Today&apos;s Products selected
                </p>

                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Add products from the left side.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedProducts.map(
                  (product, index) => {
                    const isDragging =
                      draggedId === product.id;
                    const isBusy =
                      busyId === product.id;

                    return (
                      <div
                        key={product.id}
                        draggable={
                          !savingOrder && !busyId
                        }
                        onDragStart={() =>
                          handleDragStart(product.id)
                        }
                        onDragOver={handleDragOver}
                        onDrop={() =>
                          handleDrop(product.id)
                        }
                        className={`rounded-xl border p-3 transition ${
                          isDragging
                            ? 'border-brand-400 bg-brand-50 opacity-60'
                            : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Position */}
                          <div
                            aria-label={`Position ${index + 1}`}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700"
                          >
                            {index + 1}
                          </div>

                          {/* Drag handle */}
                          <div
                            aria-hidden="true"
                            className="hidden cursor-grab select-none text-lg leading-none text-slate-300 sm:block"
                            title="Drag to reorder"
                          >
                            ⋮⋮
                          </div>

                          <ProductImage product={product} />

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {product.name}
                            </p>

                            {product.name_marathi && (
                              <p className="truncate text-xs text-slate-500">
                                {product.name_marathi}
                              </p>
                            )}

                            <p className="mt-1 truncate text-xs text-slate-400">
                              ₹
                              {product.selling_price.toFixed(
                                2
                              )}
                              {' · '}
                              {product.available_quantity}{' '}
                              {product.unit}
                            </p>
                          </div>

                          {/* Desktop controls */}
                          <div className="hidden items-center gap-1 sm:flex">
                            <button
                              type="button"
                              onClick={() =>
                                moveProduct(
                                  index,
                                  index - 1
                                )
                              }
                              disabled={
                                index === 0 ||
                                savingOrder ||
                                !!busyId
                              }
                              aria-label={`Move ${product.name} up`}
                              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              ↑
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                moveProduct(
                                  index,
                                  index + 1
                                )
                              }
                              disabled={
                                index ===
                                  selectedProducts.length -
                                    1 ||
                                savingOrder ||
                                !!busyId
                              }
                              aria-label={`Move ${product.name} down`}
                              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              ↓
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleRemove(product)
                            }
                            disabled={
                              !!busyId || savingOrder
                            }
                            aria-busy={isBusy}
                            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-red-100 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isBusy ? (
                              <>
                                <span
                                  aria-hidden="true"
                                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-200 border-t-red-600"
                                />
                                Removing…
                              </>
                            ) : (
                              'Remove'
                            )}
                          </button>
                        </div>

                        {/* Mobile ordering controls */}
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
                          <button
                            type="button"
                            onClick={() =>
                              moveProduct(
                                index,
                                index - 1
                              )
                            }
                            disabled={
                              index === 0 ||
                              savingOrder ||
                              !!busyId
                            }
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ↑ Move Up
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              moveProduct(
                                index,
                                index + 1
                              )
                            }
                            disabled={
                              index ===
                                selectedProducts.length -
                                  1 ||
                              savingOrder ||
                              !!busyId
                            }
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ↓ Move Down
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white shadow-xl sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-md"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function ProductImage({
  product,
}: {
  product: Product;
}) {
  return product.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.image_url}
      alt=""
      aria-hidden="true"
      className="h-14 w-14 shrink-0 rounded-xl bg-slate-100 object-cover"
    />
  ) : (
    <div
      aria-hidden="true"
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg"
    >
      📦
    </div>
  );
}