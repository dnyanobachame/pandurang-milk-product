import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { PackageBatchForm } from '@/components/production/PackageBatchForm';

export default async function ProductionBatchesPage() {
  const supabase = createClient();

  const { data: batches } = await supabase
    .from('production_batches')
    .select(`
      id, batch_number, production_date, expiry_date, quantity_produced,
      quantity_packed, quantity_remaining, quality_status,
      products ( id, name, unit, shelf_life_days )
    `)
    .order('created_at', { ascending: false })
    .limit(30);

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Production Batches</h1>
        <Link href="/admin/production/batches/new" className="text-sm rounded-full bg-brand-600 text-white px-4 py-2">
          + New Batch
        </Link>
      </div>

      <div className="space-y-3">
        {(batches ?? []).map((b: any) => (
          <div key={b.id} className="rounded-xl2 border border-gray-100 bg-white p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{b.products?.name}</p>
                <p className="text-xs text-gray-500 font-mono">{b.batch_number}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Produced {b.production_date} · Expires {b.expiry_date}
                </p>
              </div>
              <QualityBadge status={b.quality_status} />
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 text-sm text-gray-600">
              <span>Produced: {b.quantity_produced}</span>
              <span>Packed: {b.quantity_packed}</span>
              <span>Remaining: {b.quantity_remaining}</span>
            </div>

            {b.quality_status === 'passed' && b.quantity_packed < b.quantity_produced && (
              <PackageBatchForm
                productionBatchId={b.id}
                productId={b.products.id}
                unit={b.products.unit}
                maxQuantity={b.quantity_produced - b.quantity_packed}
                suggestedExpiry={b.expiry_date}
              />
            )}
            {b.quality_status === 'hold' && (
              <p className="text-xs text-amber-600 mt-2">
                Awaiting Quality Control before this batch can be packaged.
              </p>
            )}
          </div>
        ))}
        {(!batches || batches.length === 0) && (
          <p className="text-gray-500">No production batches yet.</p>
        )}
      </div>
    </main>
  );
}

function QualityBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    passed: 'bg-brand-50 text-brand-700',
    rejected: 'bg-red-50 text-red-700',
    hold: 'bg-amber-50 text-amber-700',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${styles[status]}`}>{status}</span>;
}
