
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, total, order_status, created_at')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-slate-50 pb-8">
      <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-5 sm:py-7 lg:px-6">

        {/* -------------------------------------------------------------- */}
        {/* HEADER                                                         */}
        {/* -------------------------------------------------------------- */}

        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-600">
            My Account
          </p>

          <div className="mt-1 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                My Orders
              </h1>

              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                View your recent orders and track their status.
              </p>
            </div>

            {orders && orders.length > 0 && (
              <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                {orders.length}{' '}
                {orders.length === 1 ? 'order' : 'orders'}
              </span>
            )}
          </div>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* ORDERS                                                         */}
        {/* -------------------------------------------------------------- */}

        {!orders || orders.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center shadow-sm sm:py-16">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-2xl"
              aria-hidden="true"
            >
              📦
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900">
              No orders yet
            </h2>

            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-5 text-slate-500">
              Your completed orders will appear here. Start shopping to
              place your first order.
            </p>

            <Link
              href="/products"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 active:scale-[0.98]"
            >
              Browse Products
              <span className="ml-1.5" aria-hidden="true">
                →
              </span>
            </Link>
          </section>
        ) : (
          <section aria-labelledby="orders-list">
            <h2 id="orders-list" className="sr-only">
              Order history
            </h2>

            <div className="space-y-3">
              {orders.map((o) => {
                const statusLabel =
                  STATUS_LABEL[o.order_status] ?? o.order_status;

                return (
                  <Link
                    key={o.id}
                    href={`/dashboard/orders/${o.id}`}
                    className="group block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 sm:p-5"
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Order
                        </p>

                        <p className="mt-0.5 truncate text-sm font-bold text-slate-900 sm:text-base">
                          #{o.order_number}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Total
                        </p>

                        <p className="mt-0.5 text-base font-bold text-slate-900 sm:text-lg">
                          ₹{o.total}
                        </p>
                      </div>
                    </div>

                    {/* Bottom row */}
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                      <StatusBadge
                        status={o.order_status}
                        label={statusLabel}
                      />

                      <span className="text-xs font-semibold text-brand-700 transition-colors group-hover:text-brand-800">
                        View details
                        <span className="ml-1" aria-hidden="true">
                          →
                        </span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* -------------------------------------------------------------- */}
        {/* FOOTER                                                         */}
        {/* -------------------------------------------------------------- */}

        <div className="mt-5 flex justify-center">
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center rounded-full px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-white hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <p className="px-2 pt-3 text-center text-[10px] text-slate-400">
          Pandurang Milk Product • Order History
        </p>
      </div>
    </main>
  );
}

function StatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  const tone = getStatusTone(status);

  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide ${tone}`}
    >
      {label}
    </span>
  );
}

function getStatusTone(status: string) {
  switch (status) {
    case 'delivered':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100';

    case 'cancelled':
    case 'rejected':
    case 'delivery_failed':
      return 'bg-red-50 text-red-700 ring-1 ring-red-100';

    case 'payment_pending':
    case 'refund_requested':
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-100';

    case 'payment_confirmed':
    case 'confirmed':
    case 'packing':
    case 'packed':
    case 'assigned':
    case 'out_for_delivery':
      return 'bg-brand-50 text-brand-700 ring-1 ring-brand-100';

    case 'refunded':
      return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200';

    case 'placed':
    default:
      return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
  }
}
