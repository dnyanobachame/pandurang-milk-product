import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

const STATUS_LABEL: Record<string, string> = {
  placed: 'Order Placed',
  payment_pending: 'Payment Pending',
  payment_confirmed: 'Payment Confirmed',
  confirmed: 'Confirmed',
  packing: 'Packing',
  packed: 'Packed',
  assigned: 'Assigned to Delivery',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  refund_requested: 'Refund Requested',
  refunded: 'Refunded',
  delivery_failed: 'Delivery Failed',
};

export default async function OrdersListPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, total, order_status, created_at')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">My Orders</h1>

      <div className="space-y-3">
        {(orders ?? []).map((o) => (
          <Link
            key={o.id}
            href={`/dashboard/orders/${o.id}`}
            className="block rounded-xl2 border border-gray-100 bg-white p-4 hover:border-brand-300 transition"
          >
            <div className="flex justify-between">
              <span className="font-medium">#{o.order_number}</span>
              <span className="font-semibold">₹{o.total}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {STATUS_LABEL[o.order_status] ?? o.order_status}
            </p>
          </Link>
        ))}
        {(!orders || orders.length === 0) && (
          <p className="text-gray-500">
            No orders yet. <Link href="/products" className="text-brand-700">Browse products →</Link>
          </p>
        )}
      </div>
    </main>
  );
}
