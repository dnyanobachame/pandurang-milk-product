import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';

const TIMELINE_STEPS = [
  'placed', 'confirmed', 'packing', 'packed', 'assigned', 'out_for_delivery', 'delivered',
] as const;

const STEP_LABEL: Record<string, string> = {
  placed: 'Order Confirmed',
  confirmed: 'Confirmed',
  packing: 'Packing',
  packed: 'Packed',
  assigned: 'Assigned to Delivery',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
};

export default async function OrderDetailPage({
  params, searchParams,
}: {
  params: { id: string };
  searchParams: { placed?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: order } = await supabase
    .from('orders')
    .select(`
      id, order_number, total, subtotal, delivery_fee, tax, order_status,
      payment_status, payment_method, created_at, customer_id,
      order_items ( quantity, unit_price, total, products ( name, unit ) )
    `)
    .eq('id', params.id)
    .single();

  if (!order || order.customer_id !== user.id) notFound();

  const currentStepIndex = TIMELINE_STEPS.indexOf(order.order_status as any);
  const isTerminalFailure = ['cancelled', 'rejected', 'delivery_failed'].includes(order.order_status);

  return (
    <main className="max-w-xl mx-auto px-6 py-10">
      {searchParams.placed && (
        <div className="mb-6 rounded-xl2 bg-brand-50 border border-brand-200 text-brand-700 p-4 text-sm">
          Your order has been placed successfully.
        </div>
      )}

      <h1 className="text-xl font-semibold">Order #{order.order_number}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {new Date(order.created_at).toLocaleString('en-IN')}
      </p>

      {/* Timeline */}
      {!isTerminalFailure && (
        <div className="flex flex-wrap gap-2 mb-8">
          {TIMELINE_STEPS.map((step, idx) => (
            <div
              key={step}
              className={`text-xs px-3 py-1 rounded-full ${
                idx <= currentStepIndex
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {STEP_LABEL[step]}
            </div>
          ))}
        </div>
      )}
      {isTerminalFailure && (
        <div className="mb-8 rounded-xl2 bg-red-50 border border-red-200 text-red-700 p-3 text-sm capitalize">
          {order.order_status.replace(/_/g, ' ')}
        </div>
      )}

      {/* Items */}
      <div className="rounded-xl2 border border-gray-100 bg-white p-4 space-y-2">
        {(order.order_items as any[]).map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span>{item.products?.name} × {item.quantity}</span>
            <span>₹{item.total}</span>
          </div>
        ))}
        <hr className="my-2" />
        <div className="flex justify-between text-sm text-gray-500">
          <span>Subtotal</span><span>₹{order.subtotal}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>Delivery</span><span>₹{order.delivery_fee}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>Tax</span><span>₹{order.tax}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Total</span><span>₹{order.total}</span>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        Payment: <span className="capitalize">{order.payment_method.replace('_', ' ')}</span> —{' '}
        <span className="capitalize">{order.payment_status.replace('_', ' ')}</span>
        {order.payment_method === 'upi_qr' && order.payment_status !== 'paid' && (
          <>
            {' '}·{' '}
            <a href={`/checkout/payment/${order.id}`} className="text-brand-700">
              Complete payment →
            </a>
          </>
        )}
      </div>
    </main>
  );
}
