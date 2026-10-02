import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';

const TIMELINE_STEPS = [
  'placed',
  'confirmed',
  'packing',
  'packed',
  'assigned',
  'out_for_delivery',
  'delivered',
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

const STATUS_LABEL: Record<string, string> = {
  placed: 'Order Confirmed',
  confirmed: 'Confirmed',
  packing: 'Packing',
  packed: 'Packed',
  assigned: 'Assigned to Delivery',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  delivery_failed: 'Delivery Failed',
};

function formatStatus(status: string) {
  return (
    STATUS_LABEL[status] ||
    status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'delivered':
      return 'bg-green-50 text-green-700 border-green-200';

    case 'cancelled':
    case 'rejected':
    case 'delivery_failed':
      return 'bg-red-50 text-red-700 border-red-200';

    case 'out_for_delivery':
    case 'assigned':
      return 'bg-blue-50 text-blue-700 border-blue-200';

    default:
      return 'bg-brand-50 text-brand-700 border-brand-200';
  }
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { placed?: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: order } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      total,
      subtotal,
      delivery_fee,
      tax,
      order_status,
      payment_status,
      payment_method,
      created_at,
      customer_id,
      order_items (
        quantity,
        unit_price,
        total,
        products (
          name,
          unit
        )
      )
    `)
    .eq('id', params.id)
    .single();

  if (!order || order.customer_id !== user.id) {
    notFound();
  }

  const currentStepIndex = TIMELINE_STEPS.indexOf(
    order.order_status as (typeof TIMELINE_STEPS)[number]
  );

  const isTerminalFailure = [
    'cancelled',
    'rejected',
    'delivery_failed',
  ].includes(order.order_status);

  const items = (order.order_items as any[]) || [];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
        {/* Back */}
        <Link
          href="/dashboard/orders"
          className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-gray-600 transition hover:bg-white hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <span aria-hidden="true">←</span>
          My Orders
        </Link>

        {/* Success message */}
        {searchParams.placed && (
          <div
            role="status"
            className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            <div className="flex items-start gap-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700"
                aria-hidden="true"
              >
                ✓
              </span>

              <div>
                <p className="font-semibold">Order placed successfully</p>
                <p className="mt-0.5 text-green-700">
                  Your order has been received and is being processed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Order header */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Order
              </p>

              <h1 className="mt-1 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                #{order.order_number}
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                {new Date(order.created_at).toLocaleString('en-IN')}
              </p>
            </div>

            <span
              className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusStyle(
                order.order_status
              )}`}
            >
              {formatStatus(order.order_status)}
            </span>
          </div>
        </section>

        {/* Order status */}
        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-bold text-gray-900">
              Order Status
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Follow your order from confirmation to delivery.
            </p>
          </div>

          {!isTerminalFailure ? (
            <div className="space-y-4">
              {TIMELINE_STEPS.map((step, idx) => {
                const isCompleted = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;

                return (
                  <div key={step} className="flex items-start gap-3">
                    <div className="relative flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${
                          isCompleted
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-gray-200 bg-gray-50 text-gray-400'
                        }`}
                      >
                        {isCompleted ? '✓' : idx + 1}
                      </div>

                      {idx < TIMELINE_STEPS.length - 1 && (
                        <div
                          className={`mt-1 h-6 w-px ${
                            idx < currentStepIndex
                              ? 'bg-brand-500'
                              : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </div>

                    <div className="min-w-0 pt-1">
                      <p
                        className={`text-sm font-semibold ${
                          isCompleted
                            ? 'text-gray-900'
                            : 'text-gray-400'
                        }`}
                      >
                        {STEP_LABEL[step]}
                      </p>

                      {isCurrent && (
                        <p className="mt-0.5 text-xs text-brand-700">
                          Current status
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">
                {formatStatus(order.order_status)}
              </p>
              <p className="mt-1 text-sm text-red-700">
                This order is no longer progressing through delivery.
              </p>
            </div>
          )}
        </section>

        {/* Items */}
        <section className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
            <h2 className="text-base font-bold text-gray-900">
              Order Items
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {item.products?.name || 'Product'}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {item.products?.unit
                      ? `${item.products.unit} · `
                      : ''}
                    Qty {item.quantity} × ₹{item.unit_price}
                  </p>
                </div>

                <p className="shrink-0 text-sm font-bold text-gray-900">
                  ₹{item.total}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Price summary */}
        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-base font-bold text-gray-900">
            Price Details
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 text-gray-600">
              <span>Subtotal</span>
              <span>₹{order.subtotal}</span>
            </div>

            <div className="flex justify-between gap-4 text-gray-600">
              <span>Delivery</span>
              <span>₹{order.delivery_fee}</span>
            </div>

            <div className="flex justify-between gap-4 text-gray-600">
              <span>Tax</span>
              <span>₹{order.tax}</span>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="flex justify-between gap-4 text-base font-bold text-gray-900">
                <span>Total</span>
                <span>₹{order.total}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Payment */}
        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-bold text-gray-900">
            Payment
          </h2>

          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold capitalize text-gray-900">
                {order.payment_method.replace(/_/g, ' ')}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Payment status:{' '}
                <span className="font-medium capitalize text-gray-700">
                  {order.payment_status.replace(/_/g, ' ')}
                </span>
              </p>
            </div>

            {order.payment_method === 'upi_qr' &&
              order.payment_status !== 'paid' && (
                <Link
                  href={`/checkout/payment/${order.id}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  Complete Payment →
                </Link>
              )}

            {order.payment_status === 'paid' && (
              <span className="inline-flex w-fit items-center rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                ✓ Paid
              </span>
            )}
          </div>
        </section>

        {/* Bottom actions */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard/orders"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            View My Orders
          </Link>

          <Link
            href="/products"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </main>
  );
}