import { createClient } from '@/lib/supabase/server';
import { InventoryAdjustmentForm } from '@/components/inventory/InventoryAdjustmentForm';

export default async function InventoryPage() {
  const supabase = createClient();

  const [{ data: stock }, { data: lowStock }, { data: nearExpiry }] = await Promise.all([
    supabase.from('current_stock').select('*').order('product_name').limit(100),
    supabase.from('low_stock_products').select('*'),
    supabase.from('near_expiry_batches').select('*').order('expiry_date'),
  ]);

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Inventory</h1>

      {(lowStock ?? []).length > 0 && (
        <section className="mb-6 rounded-xl2 border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-medium text-amber-800 mb-2">Low Stock</h2>
          <ul className="text-sm space-y-1">
            {lowStock!.map((p: any) => (
              <li key={p.id} className="flex justify-between">
                <span>{p.name}</span>
                <span>{p.available_quantity} left (min {p.min_stock_level})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(nearExpiry ?? []).length > 0 && (
        <section className="mb-6 rounded-xl2 border border-red-200 bg-red-50 p-4">
          <h2 className="font-medium text-red-800 mb-2">Near Expiry / Expired</h2>
          <ul className="text-sm space-y-1">
            {nearExpiry!.map((b: any) => (
              <li key={b.id} className="flex justify-between">
                <span className="font-mono text-xs">{b.packaging_batch_number}</span>
                <span>{b.product_name} · {b.quantity_packed} units · expires {b.expiry_date}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-medium text-gray-700 mb-3">Current Stock</h2>
        <div className="space-y-2">
          {(stock ?? []).map((row: any) => (
            <div key={row.id} className="rounded-xl2 border border-gray-100 bg-white p-3 flex justify-between items-start text-sm">
              <div>
                <p className="font-medium">{row.product_name}</p>
                {row.packaging_batch_number && (
                  <p className="text-xs text-gray-500 font-mono">
                    {row.packaging_batch_number} · expires {row.expiry_date}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-semibold">{row.current_stock} {row.unit}</p>
                <InventoryAdjustmentForm productId={row.product_id} batchId={row.batch_id} productName={row.product_name} />
              </div>
            </div>
          ))}
          {(!stock || stock.length === 0) && (
            <p className="text-gray-500 text-sm">No inventory recorded yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
