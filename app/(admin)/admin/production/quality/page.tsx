import { createClient } from '@/lib/supabase/server';
import { QualityDecisionForm } from '@/components/quality/QualityDecisionForm';

export default async function QualityControlPage() {
  const supabase = createClient();

  const [{ data: collections }, { data: batches }] = await Promise.all([
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

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Quality Control Queue</h1>

      <section className="mb-10">
        <h2 className="font-medium text-gray-700 mb-3">Milk Collections on Hold</h2>
        <div className="space-y-3">
          {(collections ?? []).map((c: any) => (
            <div key={c.id} className="rounded-xl2 border border-amber-200 bg-amber-50 p-4">
              <p className="font-medium">{c.suppliers?.name} — {c.quantity_litres}L {c.milk_type}</p>
              <p className="text-xs text-gray-500">Collected {c.collection_date}</p>
              <QualityDecisionForm referenceType="milk_collection" referenceId={c.id} />
            </div>
          ))}
          {(!collections || collections.length === 0) && (
            <p className="text-gray-500 text-sm">No milk collections waiting for testing.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-medium text-gray-700 mb-3">Production Batches on Hold</h2>
        <div className="space-y-3">
          {(batches ?? []).map((b: any) => (
            <div key={b.id} className="rounded-xl2 border border-amber-200 bg-amber-50 p-4">
              <p className="font-medium">{b.products?.name} — Batch {b.batch_number}</p>
              <p className="text-xs text-gray-500">{b.quantity_produced} produced</p>
              <QualityDecisionForm referenceType="production_batch" referenceId={b.id} />
            </div>
          ))}
          {(!batches || batches.length === 0) && (
            <p className="text-gray-500 text-sm">No production batches waiting for testing.</p>
          )}
        </div>
      </section>
    </main>
  );
}
