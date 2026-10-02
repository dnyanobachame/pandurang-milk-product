import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function CustomerDashboard() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const [
    { count: pendingCount },
    { count: deliveredCount },
    { data: activeSub },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', user.id)
      .not('order_status', 'in', '(delivered,cancelled)'),

    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', user.id)
      .eq('order_status', 'delivered'),

    supabase
      .from('subscriptions')
      .select('id, is_active')
      .eq('customer_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
  ]);

  const firstName =
    profile?.full_name?.trim().split(/\s+/)[0] || 'there';

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
        {/* Welcome */}
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-5 text-white shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                My Account
              </p>

              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Welcome, {firstName}
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
                Manage your orders, subscriptions, addresses, and support
                from one place.
              </p>
            </div>

            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold ring-1 ring-white/20 sm:h-14 sm:w-14"
              aria-hidden="true"
            >
              {(profile?.full_name?.trim()?.[0] || 'U').toUpperCase()}
            </div>
          </div>
        </section>

        {/* Account summary */}
        <section className="mt-5" aria-labelledby="account-summary">
          <div className="mb-3 px-1">
            <h2
              id="account-summary"
              className="text-base font-bold text-gray-900"
            >
              Your Account
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              A quick overview of your activity.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Pending Orders"
              value={pendingCount ?? 0}
              icon="📦"
              href="/dashboard/orders"
            />

            <StatCard
              label="Delivered Orders"
              value={deliveredCount ?? 0}
              icon="✓"
              href="/dashboard/orders"
            />

            <StatCard
              label="Subscription"
              value={activeSub ? 'Active' : 'None'}
              icon="🔄"
              href="/dashboard/subscriptions"
            />

            <StatCard
              label="Support"
              value="Get Help"
              icon="?"
              href="/dashboard/support"
            />
          </div>
        </section>

        {/* Quick actions */}
        <section className="mt-7" aria-labelledby="quick-actions">
          <div className="mb-3 px-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
              Shortcuts
            </p>

            <h2
              id="quick-actions"
              className="mt-1 text-xl font-bold tracking-tight text-gray-900"
            >
              What would you like to do?
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickAction
              href="/products"
              label="Order Products"
              icon="🛒"
            />

            <QuickAction
              href="/dashboard/orders"
              label="My Orders"
              icon="📦"
            />

            <QuickAction
              href="/dashboard/subscriptions"
              label="Subscriptions"
              icon="🔄"
            />

            <QuickAction
              href="/dashboard/addresses"
              label="Addresses"
              icon="📍"
            />
          </div>
        </section>

        {/* Support */}
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700"
              aria-hidden="true"
            >
              ?
            </span>

            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-gray-900">
                Need help?
              </h2>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Have a question about an order, delivery, payment, or
                subscription?
              </p>

              <Link
                href="/dashboard/support"
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </section>

        {/* Account links */}
        <section className="mt-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniLink href="/dashboard/notifications" label="Notifications" />
            <MiniLink href="/dashboard/settings" label="Settings" />
            <MiniLink href="/dashboard/support" label="Support" />
            <MiniLink href="/products" label="Shop Products" />
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: string | number;
  icon: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group block min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 active:scale-[0.98]"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-sm"
          aria-hidden="true"
        >
          {icon}
        </span>

        <span
          className="text-xs text-gray-300 transition-colors group-hover:text-brand-500"
          aria-hidden="true"
        >
          →
        </span>
      </div>

      <p className="mt-3 truncate text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
        {value}
      </p>

      <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>
    </Link>
  );
}

function QuickAction({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[96px] flex-col items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 p-3 text-center text-brand-700 transition hover:border-brand-200 hover:bg-brand-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 active:scale-[0.98] sm:min-h-[108px] sm:p-4"
    >
      <span
        className="text-xl transition-transform group-hover:scale-110"
        aria-hidden="true"
      >
        {icon}
      </span>

      <span className="mt-2 text-xs font-bold leading-4 sm:text-sm">
        {label}
      </span>
    </Link>
  );
}

function MiniLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-center text-xs font-semibold text-gray-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
    >
      {label}
    </Link>
  );
}