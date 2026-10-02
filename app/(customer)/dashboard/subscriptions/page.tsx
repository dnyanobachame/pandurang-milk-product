import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SubscriptionControls } from '@/components/SubscriptionControls';

export default async function SubscriptionsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select(`
      id,
      quantity,
      frequency,
      is_active,
      is_paused,
      start_date,
      products ( name, unit ),
      customer_addresses ( village_city )
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  const activeSubscriptions = (subscriptions ?? []).filter(
    (subscription) => subscription.is_active
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 sm:py-8">

        {/* Back */}
        <Link
          href="/dashboard"
          className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-medium text-gray-600 transition hover:bg-white hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <span aria-hidden="true">←</span>
          Dashboard
        </Link>

        {/* Header */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                Regular Delivery
              </p>

              <h1 className="mt-1 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                Subscriptions
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Manage your recurring milk and dairy product deliveries.
              </p>
            </div>

            <Link
              href="/dashboard/subscriptions/new"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              + New Subscription
            </Link>
          </div>
        </section>

        {/* Active count */}
        {activeSubscriptions.length > 0 && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              ✓
            </div>

            <div>
              <p className="text-sm font-semibold text-brand-900">
                {activeSubscriptions.length}{' '}
                {activeSubscriptions.length === 1
                  ? 'active subscription'
                  : 'active subscriptions'}
              </p>

              <p className="text-xs text-brand-700">
                Your recurring deliveries are listed below.
              </p>
            </div>
          </div>
        )}

        {/* Subscriptions */}
        <section className="mt-4">
          {activeSubscriptions.length > 0 ? (
            <div className="space-y-4">
              {activeSubscriptions.map((subscription: any) => (
                <article
                  key={subscription.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                    {/* Product */}
                    <div className="min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-lg">
                          🥛
                        </div>

                        <div className="min-w-0">
                          <h2 className="text-base font-bold text-gray-900">
                            {subscription.products?.name || 'Milk Product'}
                          </h2>

                          <p className="mt-1 text-sm text-gray-500">
                            {subscription.quantity}
                            {subscription.products?.unit || ''}
                            {' · '}
                            {subscription.frequency.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <span
                      className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        subscription.is_paused
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-green-200 bg-green-50 text-green-700'
                      }`}
                    >
                      {subscription.is_paused ? 'Paused' : 'Active'}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">
                        Delivery Frequency
                      </p>

                      <p className="mt-1 text-sm font-semibold capitalize text-gray-900">
                        {subscription.frequency.replace(/_/g, ' ')}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">
                        Delivery Area
                      </p>

                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {subscription.customer_addresses?.village_city ||
                          'Address not available'}
                      </p>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="mt-5 border-t border-gray-100 pt-4">
                    <SubscriptionControls
                      subscriptionId={subscription.id}
                      isPaused={subscription.is_paused}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-10 text-center shadow-sm sm:px-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-2xl">
                🥛
              </div>

              <h2 className="mt-4 text-lg font-bold text-gray-900">
                No active subscriptions
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                Set up a recurring delivery so you can receive your regular
                milk or dairy products without placing an order every time.
              </p>

              <Link
                href="/dashboard/subscriptions/new"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                Start a Subscription →
              </Link>
            </div>
          )}
        </section>

        {/* Bottom navigation */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard/orders"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            View My Orders
          </Link>

          <Link
            href="/products"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            Shop Products
          </Link>
        </div>
      </div>
    </main>
  );
}