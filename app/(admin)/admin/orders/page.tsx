import { createClient } from '@/lib/supabase/server';
import { VerifyPaymentButton } from '@/components/VerifyPaymentButton';

export default async function AdminOrdersPage() {
  const supabase = createClient();

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, order_number, total, order_status, payment_status, payment_method, created_at,
      profiles ( full_name, mobile )
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Orders</h1>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 pr-4">Order</th>
              <th className="py-2 pr-4">Customer</th>
              <th className="py-2 pr-4">Total</th>
              <th className="py-2 pr-4">Payment</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o: any) => (
              <tr key={o.id} className="border-b border-gray-50">
                <td className="py-2 pr-4">#{o.order_number}</td>
                <td className="py-2 pr-4">{o.profiles?.full_name}</td>
                <td className="py-2 pr-4">₹{o.total}</td>
                <td className="py-2 pr-4 capitalize">
                  {o.payment_method.replace('_', ' ')} — {o.payment_status.replace('_', ' ')}
                </td>
                <td className="py-2 pr-4 capitalize">{o.order_status.replace(/_/g, ' ')}</td>
                <td className="py-2 pr-4">
                  {o.payment_method === 'upi_qr' && o.payment_status === 'payment_submitted' && (
                    <VerifyPaymentButton orderId={o.id} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
