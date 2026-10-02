import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';

type PageProps = {
  params: {
    id: string;
  };
};

function formatMoney(value: number | null | undefined) {
  return `₹${Number(value ?? 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function displayText(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return String(value);
}

function formatLabel(value: unknown) {
  return String(value ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function AdminUserProfilePage({
  params,
}: PageProps) {
  const userId = String(params?.id ?? '').trim();

  if (!userId) {
    notFound();
  }

  const supabase = createClient();

  const [{ data: profile, error: profileError }, { data: orders, error: ordersError }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, mobile, email, role, is_active')
        .eq('id', userId)
        .maybeSingle(),

      supabase
        .from('orders')
        .select(
          `
            id,
            order_number,
            total,
            order_status,
            payment_status,
            payment_method,
            delivery_status,
            created_at
          `,
        )
        .eq('customer_id', userId)
        .order('created_at', { ascending: false }),
    ]);

  if (profileError || !profile) {
    notFound();
  }

  if (ordersError) {
    console.error('ADMIN CUSTOMER ORDERS FETCH ERROR:', ordersError);
  }

  const customerOrders = orders ?? [];
  const totalOrders = customerOrders.length;
  const totalValue = customerOrders.reduce(
    (sum, order) => sum + Number(order.total ?? 0),
    0,
  );
  const deliveredOrders = customerOrders.filter(
    (order) => order.order_status === 'delivered',
  ).length;
  const activeOrders = customerOrders.filter(
    (order) =>
      !['delivered', 'cancelled', 'rejected', 'refunded'].includes(
        String(order.order_status),
      ),
  ).length;

  const phone = profile.mobile ? String(profile.mobile) : '';
  const phoneDigits = phone.replace(/\D/g, '');
  const whatsappUrl = phoneDigits
    ? `https://wa.me/${phoneDigits}`
    : null;

  return (
    <main className="space-y-6">
      <AdminPageHeader
        title={profile.full_name || 'Customer Profile'}
        description="View customer contact information, order history and account activity."
      >
        <Link
          href="/admin/orders"
          className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:bg-slate-100"
        >
          ← Back to Orders
        </Link>
      </AdminPageHeader>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Total orders
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {totalOrders}
          </p>
          <p className="mt-1 text-sm text-slate-500">Customer order history</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Total order value
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatMoney(totalValue)}
          </p>
          <p className="mt-1 text-sm text-slate-500">Across all orders</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Active orders
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {activeOrders}
          </p>
          <p className="mt-1 text-sm text-slate-500">Currently in progress</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Delivered
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {deliveredOrders}
          </p>
          <p className="mt-1 text-sm text-slate-500">Completed deliveries</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-1">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">
              Customer Profile
            </h2>
          </div>

          <div className="space-y-5 p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-xl font-bold text-red-600">
                {(profile.full_name || 'C').charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-slate-900">
                  {displayText(profile.full_name)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      profile.is_active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {profile.is_active ? 'Active' : 'Inactive'}
                  </span>

                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    {formatLabel(profile.role || 'customer')}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">Mobile</p>
              {phone ? (
                <div className="mt-1 flex flex-wrap gap-2">
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex min-h-[44px] items-center rounded-xl bg-blue-50 px-3 text-sm font-semibold text-blue-700"
                  >
                    {phone}
                  </a>

                  {whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-[44px] items-center rounded-xl bg-green-50 px-3 text-sm font-semibold text-green-700"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-500">Not available</p>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">Email</p>
              <p className="mt-1 break-all text-sm font-medium text-slate-800">
                {displayText(profile.email)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">Customer ID</p>
              <p className="mt-1 break-all font-mono text-xs text-slate-500">
                {profile.id}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Order History
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Every order placed by this customer.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {totalOrders}
              </span>
            </div>
          </div>

          {customerOrders.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              No orders found for this customer.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {customerOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="block min-h-[72px] px-5 py-4 transition hover:bg-slate-50 active:bg-slate-100"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900">
                          #{order.order_number}
                        </span>
                        <AdminStatusBadge
                          status={String(order.order_status)}
                        />
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTime(order.created_at)} ·{' '}
                        {formatLabel(order.payment_method)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-left sm:text-right">
                        <p className="font-bold text-slate-900">
                          {formatMoney(order.total)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Delivery: {formatLabel(order.delivery_status)}
                        </p>
                      </div>

                      <span className="text-slate-400">→</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Quick actions</h2>
            <p className="mt-1 text-sm text-slate-500">
              Contact the customer or return to order management.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {phone ? (
              <a
                href={`tel:${phone}`}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
              >
                Call customer
              </a>
            ) : null}

            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-green-600 px-4 text-sm font-semibold text-white"
              >
                WhatsApp
              </a>
            ) : null}

            <Link
              href={`/admin/orders?query=${encodeURIComponent(
                profile.full_name || profile.id,
              )}`}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              View orders
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
