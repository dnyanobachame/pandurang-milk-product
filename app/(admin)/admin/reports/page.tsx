import { createClient } from '@/lib/supabase/server';

export default async function ReportsPage() {
  const supabase = createClient();

  const { data: dailySales } = await supabase
    .from('daily_sales')
    .select('*')
    .limit(30);

  const last30Total = (dailySales ?? []).reduce((sum, d) => sum + Number(d.revenue), 0);
  const last30Orders = (dailySales ?? []).reduce((sum, d) => sum + Number(d.order_count), 0);

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Reports</h1>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl2 border border-gray-100 bg-white p-4">
          <p className="text-xs text-gray-500">Revenue (last 30 days)</p>
          <p className="text-xl font-semibold mt-1">₹{last30Total.toLocaleString('en-IN')}</p>
        </div>
        <div className="rounded-xl2 border border-gray-100 bg-white p-4">
          <p className="text-xs text-gray-500">Orders (last 30 days)</p>
          <p className="text-xl font-semibold mt-1">{last30Orders}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-3">
        <h2 className="font-medium text-gray-700">Daily Sales</h2>
        <a
          href="/api/reports/sales"
          className="text-sm rounded-full border border-brand-200 text-brand-700 px-4 py-1.5"
        >
          Export CSV
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Orders</th>
              <th className="py-2 pr-4">Revenue</th>
              <th className="py-2 pr-4">COD</th>
              <th className="py-2 pr-4">UPI</th>
            </tr>
          </thead>
          <tbody>
            {(dailySales ?? []).map((d: any) => (
              <tr key={d.sale_date} className="border-b border-gray-50">
                <td className="py-2 pr-4">{d.sale_date}</td>
                <td className="py-2 pr-4">{d.order_count}</td>
                <td className="py-2 pr-4">₹{d.revenue}</td>
                <td className="py-2 pr-4">₹{d.cod_revenue}</td>
                <td className="py-2 pr-4">₹{d.upi_revenue}</td>
              </tr>
            ))}
            {(!dailySales || dailySales.length === 0) && (
              <tr><td colSpan={5} className="py-6 text-gray-500 text-center">No sales recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-6">
        Revenue figures shown are gross order totals, not profit — an
        estimated-margin report needs production/expense costs wired in and
        isn&apos;t built yet.
      </p>
    </main>
  );
}
