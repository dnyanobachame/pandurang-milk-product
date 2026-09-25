import { createClient } from '@/lib/supabase/server';
import { PackingTaskCard } from '@/components/packing/PackingTaskCard';

export default async function PackingDashboard() {
  const supabase = createClient();

  const { data: tasks } = await supabase
    .from('packing_tasks')
    .select('id, status, checklist, order_id, orders(order_number)')
    .in('status', ['pending_packing', 'packing'])
    .order('created_at', { ascending: true });

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Packing Queue</h1>

      <div className="space-y-4">
        {(tasks ?? []).map((task: any) => (
          <PackingTaskCard
            key={task.id}
            taskId={task.id}
            orderNumber={task.orders?.order_number ?? '—'}
            status={task.status}
            checklist={task.checklist ?? {}}
          />
        ))}

        {(!tasks || tasks.length === 0) && (
          <p className="text-gray-500">No orders waiting to be packed.</p>
        )}
      </div>
    </main>
  );
}
