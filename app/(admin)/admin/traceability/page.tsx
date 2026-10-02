export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';

type TraceabilityPageProps = {
  searchParams: { batch?: string; view?: string };
};

type BatchSummaryRow = {
  id: string;
  batch_number: string;
  production_date: string | null;
  expiry_date: string | null;
  quantity_produced: number | string | null;
  quantity_packed: number | string | null;
  quantity_sold: number | string | null;
  quantity_remaining: number | string | null;
  quality_status: string | null;
  products: { name: string } | { name: string }[] | null;
};

type RelatedProduct = { name: string } | { name: string }[] | null;
type RelatedSupplier =
  | { name: string; supplier_code: string | null }
  | { name: string; supplier_code: string | null }[]
  | null;

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function numberValue(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function batchState(batch: BatchSummaryRow) {
  const produced = numberValue(batch.quantity_produced);
  const packed = numberValue(batch.quantity_packed);
  const remaining = numberValue(batch.quantity_remaining);

  if (batch.expiry_date) {
    const expiry = new Date(batch.expiry_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!Number.isNaN(expiry.getTime()) && expiry < today) {
      return {
        label: 'Expired',
        className: 'border-red-200 bg-red-50 text-red-700',
      };
    }
  }

  if (remaining <= 0 && produced > 0) {
    return {
      label: 'Sold Out',
      className: 'border-purple-200 bg-purple-50 text-purple-700',
    };
  }

  if (produced > 0 && packed >= produced) {
    return {
      label: 'Completed',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }

  return {
    label: 'In Progress',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  };
}

function statusClasses(status: string | null | undefined) {
  const value = (status ?? '').toLowerCase();

  if (
    ['approved', 'passed', 'completed', 'packed', 'delivered', 'active'].includes(
      value,
    )
  ) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (
    ['failed', 'rejected', 'cancelled', 'expired', 'damaged'].includes(value)
  ) {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  return 'border-amber-200 bg-amber-50 text-amber-700';
}

export default async function TraceabilityPage({
  searchParams,
}: TraceabilityPageProps) {
  const query = searchParams.batch?.trim();
  const selectedView =
    searchParams.view === 'completed' ||
    searchParams.view === 'in_progress' ||
    searchParams.view === 'sold_out' ||
    searchParams.view === 'expired'
      ? searchParams.view
      : 'all';

  const supabase = createClient();

  let productionBatch: any = null;
  let batchSummaries: BatchSummaryRow[] = [];
  let packagingBatches: any[] = [];
  let orders: any[] = [];
  let notFoundMessage: string | null = null;

  if (!query) {
    const { data: recentBatches } = await supabase
      .from('production_batches')
      .select(`
        id, batch_number, production_date, expiry_date,
        quantity_produced, quantity_packed, quantity_sold, quantity_remaining,
        quality_status, products ( name )
      `)
      .order('production_date', { ascending: false })
      .limit(50);

    batchSummaries = (recentBatches ?? []) as BatchSummaryRow[];
  }

  if (query) {
    // A search can be entered as either a production batch number
    // (PM-CM500-260920-123) or a packaging batch number (…-PKG).
    const { data: pb } = await supabase
      .from('production_batches')
      .select(`
        id, batch_number, production_date, expiry_date, quantity_produced,
        quantity_packed, quantity_sold, quality_status, milk_collection_ids,
        production_staff_id, products ( name )
      `)
      .or(
        `batch_number.eq.${query},batch_number.eq.${query.replace(/-PKG$/, '')}`,
      )
      .maybeSingle();

    if (pb) {
      productionBatch = pb;

      const [
        { data: pkgBatches },
        { data: milkCollections },
        { data: qualityTests },
      ] = await Promise.all([
        supabase
          .from('packaging_batches')
          .select(
            'id, packaging_batch_number, quantity_packed, packaging_date, status, package_size',
          )
          .eq('production_batch_id', pb.id),
        pb.milk_collection_ids?.length
          ? supabase
              .from('milk_collections')
              .select(
                'id, collection_date, quantity_litres, milk_type, quality_status, suppliers(name, supplier_code)',
              )
              .in('id', pb.milk_collection_ids)
          : Promise.resolve({ data: [] }),
        // quality_tests is polymorphic (reference_type/reference_id), not a
        // real FK — queried directly rather than as an embedded relation.
        supabase
          .from('quality_tests')
          .select(
            'status, fat_percent, snf_percent, acidity, notes, tested_at',
          )
          .eq('reference_type', 'production_batch')
          .eq('reference_id', pb.id)
          .order('tested_at', { ascending: false }),
      ]);

      packagingBatches = pkgBatches ?? [];
      productionBatch.sourceMilkCollections = milkCollections ?? [];
      productionBatch.qualityTests = qualityTests ?? [];

      if (packagingBatches.length > 0) {
        const { data: relatedOrders } = await supabase
          .from('order_items')
          .select(
            'quantity, orders ( order_number, order_status, delivery_status, created_at, profiles ( full_name ) )',
          )
          .in(
            'batch_id',
            packagingBatches.map((p) => p.id),
          );

        orders = relatedOrders ?? [];
      }
    } else {
      notFoundMessage = `No batch found matching "${query}".`;
    }
  }

  const product = firstRelation<{ name: string }>(productionBatch?.products);
  const productName = product?.name ?? 'Product not specified';

  const filteredBatchSummaries = batchSummaries.filter((batch) => {
    const state = batchState(batch).label;

    if (selectedView === 'completed') return state === 'Completed';
    if (selectedView === 'in_progress') return state === 'In Progress';
    if (selectedView === 'sold_out') return state === 'Sold Out';
    if (selectedView === 'expired') return state === 'Expired';

    return true;
  });

  const batchCounts = {
    all: batchSummaries.length,
    completed: batchSummaries.filter((batch) => batchState(batch).label === 'Completed').length,
    inProgress: batchSummaries.filter((batch) => batchState(batch).label === 'In Progress').length,
    soldOut: batchSummaries.filter((batch) => batchState(batch).label === 'Sold Out').length,
    expired: batchSummaries.filter((batch) => batchState(batch).label === 'Expired').length,
  };

  const sourceCollections = productionBatch?.sourceMilkCollections ?? [];
  const qualityTests = productionBatch?.qualityTests ?? [];

  return (
    <div className="w-full space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Operations / Traceability
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Product Batch Traceability
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
                Trace a production batch from source milk through quality,
                packaging, customer orders and delivery status.
              </p>
            </div>

            {productionBatch ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Batch
                </p>
                <p className="mt-1 font-mono text-sm font-bold text-slate-900">
                  {productionBatch.batch_number}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <form
          method="get"
          className="flex flex-col gap-3 bg-slate-50/70 p-4 sm:p-5 md:flex-row"
        >
          <label className="sr-only" htmlFor="batch">
            Batch number
          </label>
          <input
            id="batch"
            name="batch"
            defaultValue={query}
            placeholder="Enter batch number, e.g. PM-CM500-260920-123"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 font-mono text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-50"
          />
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-red-600 px-6 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100"
          >
            Trace Batch
          </button>
          {query ? (
            <a
              href="/admin/traceability"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Clear
            </a>
          ) : null}
        </form>
      </section>

      {notFoundMessage ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              !
            </div>
            <div>
              <h2 className="font-semibold text-amber-900">
                Batch not found
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                {notFoundMessage}
              </p>
              <p className="mt-2 text-xs text-amber-700">
                You can search using a production batch number or a packaging
                batch number ending in <span className="font-mono">-PKG</span>.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {productionBatch ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Product
              </p>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {productName}
              </p>
              <p className="mt-1 font-mono text-xs text-slate-500">
                {productionBatch.batch_number}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Produced
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {productionBatch.quantity_produced ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatDate(productionBatch.production_date)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Packed / Sold
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {productionBatch.quantity_packed ?? 0}
                <span className="mx-1 text-sm font-normal text-slate-400">
                  /
                </span>
                {productionBatch.quantity_sold ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Packed quantity / sold quantity
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Quality Status
              </p>
              <span
                className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClasses(
                  productionBatch.quality_status,
                )}`}
              >
                {productionBatch.quality_status ?? 'Not recorded'}
              </span>
              <p className="mt-2 text-xs text-slate-500">
                Expires {formatDate(productionBatch.expiry_date)}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-red-600">
                    Stage 1
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">
                    Production Batch
                  </h2>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClasses(
                    productionBatch.quality_status,
                  )}`}
                >
                  {productionBatch.quality_status ?? 'Not recorded'}
                </span>
              </div>
            </div>

            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
              <div>
                <p className="text-xs text-slate-500">Batch number</p>
                <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                  {productionBatch.batch_number}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Production date</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatDate(productionBatch.production_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Expiry date</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatDate(productionBatch.expiry_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Production staff ID</p>
                <p className="mt-1 break-all font-mono text-xs text-slate-700">
                  {productionBatch.production_staff_id ?? '—'}
                </p>
              </div>
            </div>

            {qualityTests.length > 0 ? (
              <div className="border-t border-slate-100 px-5 py-5 sm:px-6">
                <h3 className="text-sm font-semibold text-slate-900">
                  Quality test history
                </h3>
                <div className="mt-3 space-y-2">
                  {qualityTests.map((test: any, index: number) => (
                    <div
                      key={`${test.tested_at ?? 'test'}-${index}`}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span
                          className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses(
                            test.status,
                          )}`}
                        >
                          {test.status ?? 'Not recorded'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDateTime(test.tested_at)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                        {test.fat_percent != null ? (
                          <span className="rounded-lg bg-white px-2.5 py-1.5">
                            Fat <strong>{test.fat_percent}%</strong>
                          </span>
                        ) : null}
                        {test.snf_percent != null ? (
                          <span className="rounded-lg bg-white px-2.5 py-1.5">
                            SNF <strong>{test.snf_percent}%</strong>
                          </span>
                        ) : null}
                        {test.acidity != null ? (
                          <span className="rounded-lg bg-white px-2.5 py-1.5">
                            Acidity <strong>{test.acidity}</strong>
                          </span>
                        ) : null}
                      </div>

                      {test.notes ? (
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          {test.notes}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500 sm:px-6">
                No quality tests recorded for this production batch.
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <p className="text-xs font-bold uppercase tracking-wider text-red-600">
                Stage 2
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                Source Milk Collections
              </h2>
            </div>

            <div className="p-5 sm:p-6">
              {sourceCollections.length > 0 ? (
                <div className="space-y-3">
                  {sourceCollections.map((collection: any) => {
                    const supplier = firstRelation<{
                      name: string;
                      supplier_code: string | null;
                    }>(collection.suppliers as RelatedSupplier);

                    return (
                      <div
                        key={collection.id}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {supplier?.name ?? 'Supplier not recorded'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {supplier?.supplier_code
                                ? `Supplier code: ${supplier.supplier_code}`
                                : 'Supplier code not recorded'}
                            </p>
                          </div>

                          <span
                            className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClasses(
                              collection.quality_status,
                            )}`}
                          >
                            {collection.quality_status ?? 'Not recorded'}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div>
                            <p className="text-xs text-slate-500">Quantity</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {collection.quantity_litres ?? 0} L
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Milk type</p>
                            <p className="mt-1 text-sm font-semibold capitalize text-slate-900">
                              {collection.milk_type ?? '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Collection date</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {formatDate(collection.collection_date)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No source collections recorded.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <p className="text-xs font-bold uppercase tracking-wider text-red-600">
                Stage 3
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                Packaging Batches
              </h2>
            </div>

            <div className="p-5 sm:p-6">
              {packagingBatches.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-3 py-3 font-semibold">Batch</th>
                        <th className="px-3 py-3 font-semibold">Quantity</th>
                        <th className="px-3 py-3 font-semibold">Package</th>
                        <th className="px-3 py-3 font-semibold">Date</th>
                        <th className="px-3 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {packagingBatches.map((packagingBatch) => (
                        <tr
                          key={packagingBatch.id}
                          className="border-b border-slate-50 last:border-0"
                        >
                          <td className="px-3 py-3 font-mono text-xs font-semibold text-slate-900">
                            {packagingBatch.packaging_batch_number}
                          </td>
                          <td className="px-3 py-3 text-sm text-slate-700">
                            {packagingBatch.quantity_packed ?? 0}
                          </td>
                          <td className="px-3 py-3 text-sm text-slate-700">
                            {packagingBatch.package_size ?? '—'}
                          </td>
                          <td className="px-3 py-3 text-sm text-slate-700">
                            {formatDate(packagingBatch.packaging_date)}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses(
                                packagingBatch.status,
                              )}`}
                            >
                              {packagingBatch.status ?? 'Not recorded'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Not yet packaged.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <p className="text-xs font-bold uppercase tracking-wider text-red-600">
                Stage 4
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                Customer Orders
              </h2>
            </div>

            <div className="p-5 sm:p-6">
              {orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.map((orderItem: any, index: number) => {
                    const order = firstRelation<{
                      order_number: string;
                      order_status: string | null;
                      delivery_status: string | null;
                      created_at: string | null;
                      profiles:
                        | { full_name: string | null }[]
                        | { full_name: string | null }
                        | null;
                    }>(orderItem.orders);

                    const customer = firstRelation<{
                      full_name: string | null;
                    }>(order?.profiles);

                    return (
                      <div
                        key={`${order?.order_number ?? 'order'}-${index}`}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="font-mono text-sm font-bold text-slate-900">
                              #{order?.order_number ?? '—'}
                            </p>
                            <p className="mt-1 text-sm text-slate-700">
                              {customer?.full_name ?? 'Customer not recorded'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Ordered {formatDateTime(order?.created_at)}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses(
                                order?.order_status,
                              )}`}
                            >
                              {order?.order_status ?? 'Order status unavailable'}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses(
                                order?.delivery_status,
                              )}`}
                            >
                              {order?.delivery_status ??
                                'Delivery status unavailable'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-600">
                          Batch quantity used in this order:{' '}
                          <strong>{orderItem.quantity ?? 0}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No orders have drawn from this batch yet.
                </p>
              )}
            </div>
          </section>
        </>
      ) : null}

      {!query ? (
        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ['all', 'All Batches', batchCounts.all],
              ['completed', 'Completed', batchCounts.completed],
              ['in_progress', 'In Progress', batchCounts.inProgress],
              ['sold_out', 'Sold Out', batchCounts.soldOut],
              ['expired', 'Expired', batchCounts.expired],
            ].map(([value, label, count]) => (
              <a
                key={value}
                href={`/admin/traceability${value === 'all' ? '' : `?view=${value}`}`}
                className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow ${
                  selectedView === value
                    ? 'border-red-300 ring-2 ring-red-50'
                    : 'border-slate-200'
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{count}</p>
              </a>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-red-600">
                    Batch Register
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">
                    Production Batches
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  Showing the latest 50 production batches
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredBatchSummaries.length > 0 ? (
                filteredBatchSummaries.map((batch) => {
                  const state = batchState(batch);
                  const batchProduct = firstRelation<{ name: string }>(batch.products);

                  return (
                    <div
                      key={batch.id}
                      className="p-5 transition hover:bg-slate-50/70 sm:px-6"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href={`/admin/traceability?batch=${encodeURIComponent(batch.batch_number)}`}
                              className="font-mono text-sm font-bold text-slate-900 hover:text-red-600"
                            >
                              {batch.batch_number}
                            </a>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${state.className}`}
                            >
                              {state.label}
                            </span>
                            {batch.quality_status ? (
                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses(
                                  batch.quality_status,
                                )}`}
                              >
                                Quality: {batch.quality_status}
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-1 text-sm text-slate-600">
                            {batchProduct?.name ?? 'Product not specified'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[480px]">
                          <div>
                            <p className="text-[11px] uppercase tracking-wider text-slate-400">
                              Produced
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {numberValue(batch.quantity_produced)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wider text-slate-400">
                              Packed
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {numberValue(batch.quantity_packed)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wider text-slate-400">
                              Sold
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {numberValue(batch.quantity_sold)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wider text-slate-400">
                              Remaining
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {numberValue(batch.quantity_remaining)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                        <span>
                          Produced {formatDate(batch.production_date)} · Expires{' '}
                          {formatDate(batch.expiry_date)}
                        </span>
                        <a
                          href={`/admin/traceability?batch=${encodeURIComponent(batch.batch_number)}`}
                          className="font-semibold text-red-600 hover:text-red-700"
                        >
                          View full trace →
                        </a>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <p className="font-semibold text-slate-900">
                    No batches in this category
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Try another batch status filter or search for a specific batch number.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
