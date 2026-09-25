import { createClient } from '@/lib/supabase/server';

export default async function TraceabilityPage({
  searchParams,
}: {
  searchParams: { batch?: string };
}) {
  const query = searchParams.batch?.trim();
  const supabase = createClient();

  let productionBatch: any = null;
  let packagingBatches: any[] = [];
  let orders: any[] = [];
  let notFoundMessage: string | null = null;

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
      .or(`batch_number.eq.${query},batch_number.eq.${query.replace(/-PKG$/, '')}`)
      .maybeSingle();

    if (pb) {
      productionBatch = pb;

      const [{ data: pkgBatches }, { data: milkCollections }, { data: qualityTests }] = await Promise.all([
        supabase
          .from('packaging_batches')
          .select('id, packaging_batch_number, quantity_packed, packaging_date, status, package_size')
          .eq('production_batch_id', pb.id),
        pb.milk_collection_ids?.length
          ? supabase
              .from('milk_collections')
              .select('id, collection_date, quantity_litres, milk_type, quality_status, suppliers(name, supplier_code)')
              .in('id', pb.milk_collection_ids)
          : Promise.resolve({ data: [] }),
        // quality_tests is polymorphic (reference_type/reference_id), not a
        // real FK — queried directly rather than as an embedded relation.
        supabase
          .from('quality_tests')
          .select('status, fat_percent, snf_percent, acidity, notes, tested_at')
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
          .select('quantity, orders ( order_number, order_status, delivery_status, created_at, profiles ( full_name ) )')
          .in('batch_id', packagingBatches.map((p) => p.id));
        orders = relatedOrders ?? [];
      }
    } else {
      notFoundMessage = `No batch found matching "${query}".`;
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Product Batch Traceability</h1>

      <form className="mb-8">
        <input
          name="batch"
          defaultValue={query}
          placeholder="Enter batch number, e.g. PM-CM500-260920-123"
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 font-mono text-sm"
        />
      </form>

      {notFoundMessage && <p className="text-gray-500">{notFoundMessage}</p>}

      {productionBatch && (
        <div className="space-y-6">
          <section className="rounded-xl2 border border-gray-100 bg-white p-5">
            <h2 className="font-medium mb-2">Production Batch</h2>
            <p className="font-mono text-sm">{productionBatch.batch_number}</p>
            <p className="text-sm text-gray-600 mt-1">
              {productionBatch.products?.name} · Produced {productionBatch.production_date} ·
              Expires {productionBatch.expiry_date}
            </p>
            <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
              <span>Produced: {productionBatch.quantity_produced}</span>
              <span>Packed: {productionBatch.quantity_packed}</span>
              <span>Sold: {productionBatch.quantity_sold}</span>
            </div>
            <p className="text-xs mt-2 capitalize">
              Quality: <span className="font-medium">{productionBatch.quality_status}</span>
            </p>
            {(productionBatch.qualityTests ?? []).map((t: any, idx: number) => (
              <p key={idx} className="text-xs text-gray-500 mt-1">
                Tested {new Date(t.tested_at).toLocaleDateString('en-IN')} — {t.status}
                {t.fat_percent && ` · Fat ${t.fat_percent}%`}
                {t.snf_percent && ` · SNF ${t.snf_percent}%`}
              </p>
            ))}
          </section>

          <section className="rounded-xl2 border border-gray-100 bg-white p-5">
            <h2 className="font-medium mb-2">↑ Source Milk Collections</h2>
            {(productionBatch.sourceMilkCollections ?? []).map((c: any) => (
              <div key={c.id} className="text-sm border-b border-gray-50 py-2 last:border-0">
                {c.suppliers?.name} ({c.suppliers?.supplier_code}) — {c.quantity_litres}L {c.milk_type},
                collected {c.collection_date} — quality: {c.quality_status}
              </div>
            ))}
            {(!productionBatch.sourceMilkCollections || productionBatch.sourceMilkCollections.length === 0) && (
              <p className="text-sm text-gray-500">No source collections recorded.</p>
            )}
          </section>

          <section className="rounded-xl2 border border-gray-100 bg-white p-5">
            <h2 className="font-medium mb-2">↓ Packaging Batches</h2>
            {packagingBatches.map((pb) => (
              <div key={pb.id} className="text-sm border-b border-gray-50 py-2 last:border-0">
                <span className="font-mono">{pb.packaging_batch_number}</span> —{' '}
                {pb.quantity_packed} × {pb.package_size} — packaged {pb.packaging_date} — {pb.status}
              </div>
            ))}
            {packagingBatches.length === 0 && (
              <p className="text-sm text-gray-500">Not yet packaged.</p>
            )}
          </section>

          <section className="rounded-xl2 border border-gray-100 bg-white p-5">
            <h2 className="font-medium mb-2">↓ Customer Orders Containing This Batch</h2>
            {orders.map((o: any, idx: number) => (
              <div key={idx} className="text-sm border-b border-gray-50 py-2 last:border-0">
                #{o.orders?.order_number} — {o.orders?.profiles?.full_name} — qty {o.quantity} —{' '}
                {o.orders?.order_status} / {o.orders?.delivery_status}
              </div>
            ))}
            {orders.length === 0 && (
              <p className="text-sm text-gray-500">No orders have drawn from this batch yet.</p>
            )}
          </section>
        </div>
      )}

      {!query && (
        <p className="text-gray-500 text-sm">
          Enter a batch number above to trace it from milk source through delivery.
        </p>
      )}
    </main>
  );
}
