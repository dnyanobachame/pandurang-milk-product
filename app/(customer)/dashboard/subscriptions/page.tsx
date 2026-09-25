import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SubscriptionControls } from '@/components/SubscriptionControls';

export default async function SubscriptionsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select(`
      id, quantity, frequency, is_active, is_paused, start_date,
      products ( name, unit ),
      customer_addresses ( village_city )
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <main className="max-w-xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Subscriptions</h1>
        <Link href="/dashboard/subscriptions/new" className="text-sm text-brand-700 font-medium">
          + New Subscription
        </Link>
      </div>

      <div className="space-y-3">
        {(subscriptions ?? []).filter((s) => s.is_active).map((s: any) => (
          <div key={s.id} className="rounded-xl2 border border-gray-100 bg-white p-4">
            <p className="font-medium">
              {s.products?.name} — {s.quantity}{s.products?.unit}
            </p>
            <p className="text-sm text-gray-500 capitalize">
              {s.frequency.replace(/_/g, ' ')} · {s.customer_addresses?.village_city}
            </p>
            <p className="text-xs mt-1">
              {s.is_paused ? (
                <span className="text-amber-600">Paused</span>
              ) : (
                <span className="text-brand-700">Active</span>
              )}
            </p>
            <SubscriptionControls subscriptionId={s.id} isPaused={s.is_paused} />
          </div>
        ))}
        {(!subscriptions || subscriptions.filter((s) => s.is_active).length === 0) && (
          <p className="text-gray-500">
            No active subscriptions.{' '}
            <Link href="/dashboard/subscriptions/new" className="text-brand-700">
              Start one →
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
