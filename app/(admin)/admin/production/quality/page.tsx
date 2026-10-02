import { createClient } from '@/lib/supabase/server';
import { QualityDecisionForm } from '@/components/quality/QualityDecisionForm';

type MilkCollection = {
  id: string;
  collection_date: string;
  milk_type: string;
  quantity_litres: number;
  suppliers: { name: string }[] | null;
};

type ProductionBatch = {
  id: string;
  batch_number: string;
  quantity_produced: number;
  products: { name: string }[] | null;
};

function formatMilkType(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Milk';
}

export default async function QualityControlPage() {
  const supabase = createClient();

  const [{ data: collections, error: collectionsError }, { data: batches, error: batchesError }] =
    await Promise.all([
      supabase
        .from('milk_collections')
        .select('id, collection_date, milk_type, quantity_litres, suppliers(name)')
        .eq('quality_status', 'hold')
        .order('created_at', { ascending: true }),
      supabase
        .from('production_batches')
        .select('id, batch_number, quantity_produced, products(name)')
        .eq('quality_status', 'hold')
        .order('created_at', { ascending: true }),
    ]);

  if (collectionsError) {
    throw new Error(`Failed to load milk quality queue: ${collectionsError.message}`);
  }

  if (batchesError) {
    throw new Error(`Failed to load production quality queue: ${batchesError.message}`);
  }

  const milkCollections = (collections ?? []) as MilkCollection[];
  const productionBatches = (batches ?? []) as ProductionBatch[];

  const totalMilkLitres = milkCollections.reduce(
    (sum, collection) => sum + Number(collection.quantity_litres || 0),
    0,
  );

  const totalBatchQuantity = productionBatches.reduce(
    (sum, batch) => sum + Number(batch.quantity_produced || 0),
    0,
  );

  const totalQueue = milkCollections.length + productionBatches.length;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        {/* Page header */}
        <header className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <a
                  href="/admin/production"
                  className="rounded-md px-1 py-1 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  Production
                </a>
                <span aria-hidden="true">/</span>
                <span className="font-medium text-slate-700">Quality Control</span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Quality Control
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Review milk collections and production batches currently on hold, then record
                the quality decision.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex min-h-10 items-center rounded-full border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-800">
                {totalQueue} awaiting review
              </span>
            </div>
          </div>
        </header>

        {/* KPI cards */}
        <section
          aria-label="Quality control summary"
          className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total Queue
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{totalQueue}</p>
            <p className="mt-1 text-xs text-slate-500">Items on hold</p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Milk Collections
            </p>
            <p className="mt-2 text-2xl font-bold text-amber-950">{milkCollections.length}</p>
            <p className="mt-1 text-xs text-amber-700">
              {totalMilkLitres.toLocaleString('en-IN')} L awaiting test
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Production Batches
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{productionBatches.length}</p>
            <p className="mt-1 text-xs text-slate-500">
              {totalBatchQuantity.toLocaleString('en-IN')} units produced
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Action Required
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-950">{totalQueue}</p>
            <p className="mt-1 text-xs text-emerald-700">Quality decisions pending</p>
          </div>
        </section>

        {/* Queue */}
        <div className="space-y-7">
          <section
            aria-labelledby="milk-quality-heading"
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2
                    id="milk-quality-heading"
                    className="text-base font-bold text-slate-950 sm:text-lg"
                  >
                    Milk Collections on Hold
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Test and decide whether collected milk can move forward in production.
                  </p>
                </div>
                <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  {milkCollections.length} pending
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {milkCollections.length > 0 ? (
                <div className="space-y-3">
                  {milkCollections.map((collection) => (
                    <article
                      key={collection.id}
                      className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex min-h-8 items-center rounded-full bg-amber-100 px-2.5 text-xs font-bold text-amber-800">
                              QUALITY HOLD
                            </span>
                            <span className="text-xs font-medium text-slate-500">
                              {collection.collection_date}
                            </span>
                          </div>

                          <h3 className="mt-2 text-base font-bold text-slate-950">
                            {collection.suppliers?.[0]?.name ?? 'Unknown supplier'}
                          </h3>

                          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <div>
                              <p className="text-xs text-slate-500">Milk type</p>
                              <p className="mt-0.5 text-sm font-semibold text-slate-800">
                                {formatMilkType(collection.milk_type)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Quantity</p>
                              <p className="mt-0.5 text-sm font-semibold text-slate-800">
                                {Number(collection.quantity_litres).toLocaleString('en-IN')} L
                              </p>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <p className="text-xs text-slate-500">Reference</p>
                              <p className="mt-0.5 truncate text-xs font-medium text-slate-600">
                                {collection.id}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="w-full shrink-0 lg:max-w-md">
                          <QualityDecisionForm
                            referenceType="milk_collection"
                            referenceId={collection.id}
                          />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">
                    ✓
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900">
                    No milk collections waiting for testing
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    The milk quality queue is currently clear.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section
            aria-labelledby="batch-quality-heading"
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2
                    id="batch-quality-heading"
                    className="text-base font-bold text-slate-950 sm:text-lg"
                  >
                    Production Batches on Hold
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Complete quality review before batches are released for packaging.
                  </p>
                </div>
                <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  {productionBatches.length} pending
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {productionBatches.length > 0 ? (
                <div className="space-y-3">
                  {productionBatches.map((batch) => (
                    <article
                      key={batch.id}
                      className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex min-h-8 items-center rounded-full bg-amber-100 px-2.5 text-xs font-bold text-amber-800">
                              QUALITY HOLD
                            </span>
                            <span className="text-xs font-medium text-slate-500">
                              Batch {batch.batch_number}
                            </span>
                          </div>

                          <h3 className="mt-2 text-base font-bold text-slate-950">
                            {batch.products?.[0]?.name ?? 'Unknown product'}
                          </h3>

                          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <div>
                              <p className="text-xs text-slate-500">Batch number</p>
                              <p className="mt-0.5 text-sm font-semibold text-slate-800">
                                {batch.batch_number}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Produced</p>
                              <p className="mt-0.5 text-sm font-semibold text-slate-800">
                                {Number(batch.quantity_produced).toLocaleString('en-IN')}
                              </p>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <p className="text-xs text-slate-500">Reference</p>
                              <p className="mt-0.5 truncate text-xs font-medium text-slate-600">
                                {batch.id}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="w-full shrink-0 lg:max-w-md">
                          <QualityDecisionForm
                            referenceType="production_batch"
                            referenceId={batch.id}
                          />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">
                    ✓
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900">
                    No production batches waiting for testing
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    All production batches have been reviewed or are not currently on hold.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Operational note */}
        {totalQueue > 0 && (
          <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900 sm:px-5">
            <p className="font-semibold">Quality workflow</p>
            <p className="mt-1 leading-6 text-blue-800">
              Review the measurements and applicable checks in each form, then record the quality
              decision. Items should remain on hold until the review is completed.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
