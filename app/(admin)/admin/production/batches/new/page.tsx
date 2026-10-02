'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createProductionBatch } from '@/app/actions/production';

type Product = {
  id: string;
  name: string;
  sku: string;
  shelf_life_days: number | null;
};

type Collection = {
  id: string;
  quantity_litres: number;
  milk_type: string;
  collection_date: string;
  suppliers: { name: string } | null;
};

export default function NewProductionBatchPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [productId, setProductId] = useState('');
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [quantityProduced, setQuantityProduced] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    Promise.all([
      supabase
        .from('products')
        .select('id, name, sku, shelf_life_days')
        .eq('is_active', true)
        .order('name'),

      supabase
        .from('milk_collections')
        .select(
          'id, quantity_litres, milk_type, collection_date, suppliers(name)'
        )
        .eq('quality_status', 'passed')
        .order('collection_date', { ascending: false })
        .limit(50),
    ]).then(([{ data: prods }, { data: cols }]) => {
      setProducts(prods ?? []);
      setCollections((cols as any) ?? []);

      if (prods?.[0]) {
        setProductId(prods[0].id);
      }
    });
  }, []);

  function toggleCollection(id: string) {
    setSelectedCollections((previous) =>
      previous.includes(id)
        ? previous.filter((collectionId) => collectionId !== id)
        : [...previous, id]
    );
  }

  const selectedProduct = products.find(
    (product) => product.id === productId
  );

  const selectedMilkLitres = useMemo(
    () =>
      collections
        .filter((collection) =>
          selectedCollections.includes(collection.id)
        )
        .reduce(
          (sum, collection) =>
            sum + Number(collection.quantity_litres ?? 0),
          0
        ),
    [collections, selectedCollections]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedProduct) {
      setError('Please select a product.');
      return;
    }

    const quantity = Number(quantityProduced);

    if (!quantity || quantity <= 0) {
      setError('Enter a valid production quantity.');
      return;
    }

    setSaving(true);
    setError(null);

    const result = await createProductionBatch({
      productId,
      productCode: selectedProduct.sku
        .replace(/[^A-Z0-9]/gi, '')
        .slice(0, 6)
        .toUpperCase(),
      milkCollectionIds: selectedCollections,
      quantityProduced: quantity,
      shelfLifeDays: selectedProduct.shelf_life_days ?? 3,
      notes: notes || undefined,
    });

    if (result?.error) {
      setSaving(false);
      setError(result.error);
    }
  }

  return (
    <main className="min-w-0 bg-slate-50 px-4 py-5 pb-8 md:px-8 md:py-7">
      <div className="mx-auto max-w-4xl">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <Link
            href="/admin/production/batches"
            className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 active:scale-[0.99]"
          >
            ← Production Batches
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
              New Batch
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              Traceable Production
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
            New Production Batch
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
            Create a production batch using quality-passed milk collections.
            Selected collections form the source traceability chain for the batch.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <SectionHeading
              title="Production Details"
              description="Choose the product and enter the quantity that will be produced."
            />

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Field label="Product" required>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Quantity Produced" required>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    step="0.01"
                    required
                    value={quantityProduced}
                    onChange={(e) => setQuantityProduced(e.target.value)}
                    inputMode="decimal"
                    className={`${inputClass} pr-20`}
                    placeholder="Enter quantity"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                    units
                  </span>
                </div>
              </Field>
            </div>

            {selectedProduct && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <InfoTile label="SKU" value={selectedProduct.sku} />
                <InfoTile
                  label="Shelf Life"
                  value={`${selectedProduct.shelf_life_days ?? 3} days`}
                />
                <InfoTile
                  label="Source Milk"
                  value={`${selectedMilkLitres.toFixed(2)} L`}
                />
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <SectionHeading
                title="Source Milk Collections"
                description="Only quality-passed collections are eligible for production."
              />

              <span className="inline-flex min-h-[32px] items-center self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {selectedCollections.length} selected
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              {collections.length > 0 ? (
                <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
                  {collections.map((collection) => {
                    const selected = selectedCollections.includes(
                      collection.id
                    );

                    return (
                      <label
                        key={collection.id}
                        className={`flex min-h-[72px] cursor-pointer items-center gap-3 p-4 transition ${
                          selected
                            ? 'bg-red-50'
                            : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleCollection(collection.id)}
                          className="h-5 w-5 shrink-0 accent-red-600"
                        />

                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-slate-900">
                            {collection.suppliers?.name ??
                              'Unknown supplier'}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {collection.quantity_litres} L ·{' '}
                            <span className="capitalize">
                              {collection.milk_type}
                            </span>{' '}
                            · {collection.collection_date}
                          </span>
                        </span>

                        {selected && (
                          <span className="shrink-0 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
                            Selected
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-xl">
                    🥛
                  </div>
                  <p className="mt-4 font-bold text-slate-900">
                    No quality-passed collections available
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                    Clear eligible collections through Quality Control first,
                    then return here to create the batch.
                  </p>
                  <Link
                    href="/admin/production/quality"
                    className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Open Quality Control →
                  </Link>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-500">
                Selected source milk
              </span>
              <span className="font-bold text-slate-950">
                {selectedMilkLitres.toFixed(2)} L
              </span>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <SectionHeading
              title="Notes"
              description="Optional information for this production batch."
            />

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className={`${inputClass} mt-5 resize-y`}
              placeholder="Add production notes..."
            />
          </section>

          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium leading-6 text-red-700"
            >
              {error}
            </div>
          )}

          <div className="sticky bottom-3 z-10 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/admin/production/batches"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.99]"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving || products.length === 0}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-red-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Creating…' : 'Create Batch'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-800">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function InfoTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 truncate font-bold text-slate-900">{value}</p>
    </div>
  );
}

const inputClass =
  'min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-50';
