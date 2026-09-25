import { createClient } from '@/lib/supabase/server';
import { AssignPartnerForm } from '@/components/delivery/AssignPartnerForm';

export default async function AdminDeliveryPage() {
  const supabase = createClient();

  const [
    { data: unassignedOrders },
    { data: activeAssignments },
    { data: partners },
    { count: deliveredToday },
    { count: failedCount },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, total, delivery_address_id, customer_addresses(village_city)')
      .eq('order_status', 'packed')
      .order('created_at', { ascending: true }),
    supabase
      .from('delivery_assignments')
      .select('id, status, order_id, orders(order_number, total, payment_method), profiles!delivery_assignments_delivery_partner_id_fkey(full_name)')
      .in('status', ['assigned', 'accepted', 'picked_up', 'out_for_delivery', 'reached_customer'])
      .order('assigned_at', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, full_name, delivery_partners(is_on_duty)')
      .eq('role', 'delivery_partner')
      .eq('is_active', true),
    supabase.from('delivery_assignments').select('id', { count: 'exact', head: true })
      .eq('status', 'delivered').gte('delivered_at', new Date().toISOString().slice(0, 10)),
    supabase.from('delivery_assignments').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
  ]);

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Delivery</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Pending Assignment" value={unassignedOrders?.length ?? 0} tone={unassignedOrders?.length ? 'warn' : undefined} />
        <Stat label="In Progress" value={activeAssignments?.length ?? 0} />
        <Stat label="Delivered Today" value={deliveredToday ?? 0} />
        <Stat label="Failed" value={failedCount ?? 0} tone={failedCount ? 'warn' : undefined} />
      </div>

      <section className="mb-10">
        <h2 className="font-medium text-gray-700 mb-3">Ready for Assignment</h2>
        <div className="space-y-3">
          {(unassignedOrders ?? []).map((o: any) => (
            <div key={o.id} className="rounded-xl2 border border-gray-100 bg-white p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">Order #{o.order_number}</p>
                  <p className="text-sm text-gray-500">{o.customer_addresses?.village_city} · ₹{o.total}</p>
                </div>
                <AssignPartnerForm
                  orderId={o.id}
                  partners={(partners ?? []).map((p: any) => ({
                    id: p.id, name: p.full_name, onDuty: p.delivery_partners?.[0]?.is_on_duty ?? false,
                  }))}
                />
              </div>
            </div>
          ))}
          {(!unassignedOrders || unassignedOrders.length === 0) && (
            <p className="text-gray-500 text-sm">No packed orders waiting for a delivery partner.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-medium text-gray-700 mb-3">In Progress</h2>
        <div className="space-y-3">
          {(activeAssignments ?? []).map((a: any) => (
            <div key={a.id} className="rounded-xl2 border border-gray-100 bg-white p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">Order #{a.orders?.order_number}</p>
                <p className="text-sm text-gray-500 capitalize">
                  {a.profiles?.full_name} · {a.status.replace(/_/g, ' ')}
                </p>
              </div>
              <span className="text-sm font-semibold">₹{a.orders?.total}</span>
            </div>
          ))}
          {(!activeAssignments || activeAssignments.length === 0) && (
            <p className="text-gray-500 text-sm">No deliveries currently in progress.</p>
          )}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'warn' }) {
  return (
    <div className={`rounded-xl2 border p-4 ${tone === 'warn' ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-white'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}
