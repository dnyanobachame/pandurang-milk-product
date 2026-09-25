import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function MilkCollectionsPage() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: collections } = await supabase
    .from('milk_collections')
    .select('id, collection_date, milk_type, quantity_litres, fat_percent, rate_per_litre, total_amount, quality_status, suppliers(name, supplier_code)')
    .gte('collection_date', today)
    .order('created_at', { ascending: false });

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Milk Collection</h1>
        <Link href="/admin/production/collections/new" className="text-sm rounded-full bg-brand-600 text-white px-4 py-2">
          + Record Collection
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 pr-4">Farmer</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Qty (L)</th>
              <th className="py-2 pr-4">Fat %</th>
              <th className="py-2 pr-4">Rate</th>
              <th className="py-2 pr-4">Total</th>
              <th className="py-2 pr-4">Quality</th>
            </tr>
          </thead>
          <tbody>
            {(collections ?? []).map((c: any) => (
              <tr key={c.id} className="border-b border-gray-50">
                <td className="py-2 pr-4">{c.suppliers?.name}</td>
                <td className="py-2 pr-4 capitalize">{c.milk_type}</td>
                <td className="py-2 pr-4">{c.quantity_litres}</td>
                <td className="py-2 pr-4">{c.fat_percent ?? '—'}</td>
                <td className="py-2 pr-4">₹{c.rate_per_litre}</td>
                <td className="py-2 pr-4">₹{c.total_amount}</td>
                <td className="py-2 pr-4">
                  <QualityBadge status={c.quality_status} />
                </td>
              </tr>
            ))}
            {(!collections || collections.length === 0) && (
              <tr><td colSpan={7} className="py-6 text-gray-500 text-center">No collections recorded today.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500 mt-4">
        New collections start on <strong>Hold</strong> until cleared in{' '}
        <Link href="/admin/production/quality" className="text-brand-700">Quality Control →</Link>
      </p>
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
