import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DeliveryAssignmentCard } from '@/components/delivery/DeliveryAssignmentCard';

export default async function DeliveryDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: assignments }, completedToday, cashResult] = await Promise.all([
    supabase
      .from('delivery_assignments')
      .select(`
        id, status, order_id,
        orders ( order_number, total, payment_method, customer_addresses ( village_city, address_line ) )
      `)
      .eq('delivery_partner_id', user.id)
      .in('status', ['assigned', 'accepted', 'picked_up', 'out_for_delivery', 'reached_customer'])
      .order('assigned_at', { ascending: true }),
    supabase.from('delivery_assignments').select('id', { count: 'exact', head: true })
      .eq('delivery_partner_id', user.id).eq('status', 'delivered')
      .gte('delivered_at', today),
    supabase.from('delivery_assignments').select('cash_collected')
      .eq('delivery_partner_id', user.id).eq('status', 'delivered').gte('delivered_at', today),
  ]);

  const cashCollectedToday = (cashResult.data ?? []).reduce((sum, r) => sum + Number(r.cash_collected ?? 0), 0);

  return (
    <main className="max-w-md mx-auto px-4 py-8 pb-24">
      <h1 className="text-xl font-semibold">Good day, Partner</h1>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <StatChip label="Pending" value={assignments?.length ?? 0} />
        <StatChip label="Delivered" value={completedToday.count ?? 0} />
        <StatChip label="Cash Collected" value={`₹${cashCollectedToday}`} />
      </div>

      <div className="mt-6 space-y-3">
        {(assignments ?? []).map((a: any) => (
          <DeliveryAssignmentCard
            key={a.id}
            assignmentId={a.id}
            orderNumber={a.orders?.order_number ?? '—'}
            total={a.orders?.total ?? 0}
            paymentMethod={a.orders?.payment_method ?? 'cod'}
            address={a.orders?.customer_addresses?.village_city ?? ''}
            status={a.status}
          />
        ))}
        {(!assignments || assignments.length === 0) && (
          <p className="text-gray-500 text-sm">No deliveries assigned right now.</p>
        )}
      </div>

      {/* Bottom nav — mobile-first */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-2">
        {['Home', 'Deliveries', 'Earnings', 'Profile'].map((label) => (
          <span key={label} className="text-xs text-gray-500">{label}</span>
        ))}
      </nav>
    </main>
  );
}

function StatChip({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl2 border border-gray-100 bg-white p-3 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
