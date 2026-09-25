import { createClient } from '@/lib/supabase/server';

export default async function AdminDashboard() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: todayOrders },
    { count: pendingDeliveries },
    { data: lowStockProducts },
  ] = await Promise.all([
    supabase.from('orders').select('total, order_status').gte('created_at', today),
    supabase.from('orders').select('id', { count: 'exact', head: true })
      .in('delivery_status', ['assigned', 'accepted', 'out_for_delivery']),
    supabase.from('low_stock_products').select('id, name, available_quantity, min_stock_level').limit(5),
  ]);

  const revenueToday = (todayOrders ?? []).reduce((sum, o) => sum + Number(o.total ?? 0), 0);

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Business Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Today's Revenue" value={`₹${revenueToday.toLocaleString('en-IN')}`} />
        <Card label="Today's Orders" value={todayOrders?.length ?? 0} />
        <Card label="Pending Deliveries" value={pendingDeliveries ?? 0} />
        <Card label="Low Stock Items" value={lowStockProducts?.length ?? 0} tone="warn" />
      </div>

      <section className="mt-10 grid md:grid-cols-2 gap-6">
        <div className="rounded-xl2 border border-gray-100 bg-white p-5">
          <h2 className="font-medium mb-3">Quick Links</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <a href="/admin/orders" className="text-brand-700 hover:underline">Orders</a>
            <a href="/admin/production" className="text-brand-700 hover:underline">Production</a>
            <a href="/admin/production/quality" className="text-brand-700 hover:underline">Quality Control</a>
            <a href="/packing" className="text-brand-700 hover:underline">Packing</a>
            <a href="/admin/inventory" className="text-brand-700 hover:underline">Inventory</a>
            <a href="/admin/traceability" className="text-brand-700 hover:underline">Batch Traceability</a>
            <a href="/admin/delivery" className="text-brand-700 hover:underline">Delivery</a>
            <a href="/admin/delivery/areas" className="text-brand-700 hover:underline">Delivery Areas</a>
            <a href="/admin/suppliers" className="text-brand-700 hover:underline">Suppliers</a>
            <a href="/admin/expenses" className="text-brand-700 hover:underline">Expenses</a>
            <a href="/admin/reports" className="text-brand-700 hover:underline">Reports</a>
            <a href="/admin/users" className="text-brand-700 hover:underline">Staff &amp; Users</a>
          </div>
        </div>

        <div className="rounded-xl2 border border-gray-100 bg-white p-5">
          <h2 className="font-medium mb-3">Low Stock Alerts</h2>
          {(lowStockProducts ?? []).length === 0 && (
            <p className="text-sm text-gray-500">No low-stock items right now.</p>
          )}
          <ul className="text-sm space-y-2">
            {(lowStockProducts ?? []).map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>{p.name}</span>
                <span className="text-amber-600">{p.available_quantity} left (min {p.min_stock_level})</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

function Card({ label, value, tone }: { label: string; value: string | number; tone?: 'warn' }) {
  return (
    <div className={`rounded-xl2 border p-4 shadow-sm ${tone === 'warn' ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-white'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}
