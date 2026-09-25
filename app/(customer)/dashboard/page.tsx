import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function CustomerDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles').select('full_name').eq('id', user.id).single();

  const [{ count: pendingCount }, { count: deliveredCount }, { data: activeSub }] =
    await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true })
        .eq('customer_id', user.id).not('order_status', 'in', '(delivered,cancelled)'),
      supabase.from('orders').select('id', { count: 'exact', head: true })
        .eq('customer_id', user.id).eq('order_status', 'delivered'),
      supabase.from('subscriptions').select('id, is_active')
        .eq('customer_id', user.id).eq('is_active', true).limit(1).maybeSingle(),
    ]);

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold">Welcome, {profile?.full_name ?? 'there'}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <StatCard label="Pending Orders" value={pendingCount ?? 0} />
        <StatCard label="Delivered Orders" value={deliveredCount ?? 0} />
        <StatCard label="Active Subscription" value={activeSub ? 'Yes' : 'None'} />
        <StatCard label="Support" value="Get Help" href="/dashboard/support" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <QuickAction href="/products" label="Order Products" />
        <QuickAction href="/dashboard/orders" label="My Orders" />
        <QuickAction href="/dashboard/subscriptions" label="Subscriptions" />
        <QuickAction href="/dashboard/addresses" label="Addresses" />
      </div>
    </main>
  );
}

function StatCard({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const content = (
    <div className="rounded-xl2 border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold mt-1">{value}</p>
    </div>
  );
  return href ? <a href={href}>{content}</a> : content;
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-xl2 border border-brand-100 bg-brand-50 text-brand-700 p-4 text-center font-medium hover:bg-brand-100 transition"
    >
      {label}
    </a>
  );
}
