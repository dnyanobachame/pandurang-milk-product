import { createClient } from '@/lib/supabase/server';
import { PackingTaskCard } from '@/components/packing/PackingTaskCard';

export const dynamic = 'force-dynamic';

type PackingTask = {
  id: string;
  status: string;
  checklist: Record<string, boolean> | null;
  order_id: string;
  orders: { order_number: string }[] | null;
};

function statusLabel(status: string) {
  if (status === 'packing') return 'Packing in progress';
  if (status === 'pending_packing') return 'Waiting to pack';
  return status.replaceAll('_', ' ');
}

export default async function PackingDashboard() {
  const supabase = createClient();

  const { data: tasks, error } = await supabase
    .from('packing_tasks')
    .select('id, status, checklist, order_id, orders(order_number)')
    .in('status', ['pending_packing', 'packing'])
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load packing queue: ${error.message}`);
  }

  const packingTasks = (tasks ?? []) as PackingTask[];

  const inProgressCount = packingTasks.filter(
    (task) => task.status === 'packing'
  ).length;

  const waitingCount = packingTasks.filter(
    (task) => task.status === 'pending_packing'
  ).length;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">

        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-600">
                Pandurang Milk Product
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Packing Queue
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
                Pack confirmed orders safely and complete each required
                checklist step before dispatch.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm lg:min-w-[190px]">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Queue
              </p>

              <p className="mt-1 text-xl font-bold text-gray-900">
                {packingTasks.length}{' '}
                {packingTasks.length === 1 ? 'order' : 'orders'}
              </p>
            </div>
          </div>
        </header>

        {/* Queue summary */}
        <section
          aria-label="Packing queue summary"
          className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3"
        >
          <SummaryCard
            label="Total Queue"
            value={packingTasks.length}
            description="Orders awaiting completion"
          />

          <SummaryCard
            label="Waiting"
            value={waitingCount}
            description="Ready to start packing"
            tone="amber"
          />

          <SummaryCard
            label="In Progress"
            value={inProgressCount}
            description="Currently being packed"
            tone="blue"
            className="col-span-2 sm:col-span-1"
          />
        </section>

        {/* Queue */}
        <section aria-labelledby="packing-queue-heading">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="packing-queue-heading"
                className="text-lg font-bold text-gray-900"
              >
                Orders to Pack
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Work from the oldest packing task first.
              </p>
            </div>

            {packingTasks.length > 0 && (
              <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                {packingTasks.length} active task
                {packingTasks.length === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {packingTasks.length > 0 ? (
            <div className="space-y-4">
              {packingTasks.map((task) => {
                const orderNumber =
                  task.orders?.[0]?.order_number ?? '—';

                return (
                  <article
                    key={task.id}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                  >
                    <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Order
                        </p>

                        <p className="mt-0.5 truncate text-base font-bold text-gray-900">
                          {orderNumber}
                        </p>
                      </div>

                      <span
                        className={`inline-flex min-h-8 w-fit items-center rounded-full px-3 text-xs font-bold ${
                          task.status === 'packing'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {statusLabel(task.status)}
                      </span>
                    </div>

                    <div className="p-3 sm:p-5">
                      <PackingTaskCard
                        taskId={task.id}
                        orderNumber={orderNumber}
                        status={task.status}
                        checklist={task.checklist ?? {}}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-12 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-2xl font-bold text-green-600">
                ✓
              </div>

              <h2 className="mt-4 text-base font-bold text-gray-900">
                Packing queue is clear
              </h2>

              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-gray-500">
                New confirmed orders will appear here when they are ready for
                packing.
              </p>
            </div>
          )}
        </section>

        {/* Workflow note */}
        {packingTasks.length > 0 && (
          <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900 sm:px-5">
            <p className="font-semibold">Packing workflow</p>

            <p className="mt-1 leading-6 text-blue-800">
              Complete the checklist and use the existing packing action for
              each order. The queue is ordered from the oldest task to the
              newest task.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  description,
  tone = 'default',
  className = '',
}: {
  label: string;
  value: number;
  description: string;
  tone?: 'default' | 'amber' | 'blue';
  className?: string;
}) {
  const styles = {
    default: {
      wrapper: 'border-gray-200 bg-white',
      label: 'text-gray-500',
      value: 'text-gray-900',
      description: 'text-gray-500',
    },
    amber: {
      wrapper: 'border-amber-200 bg-amber-50',
      label: 'text-amber-700',
      value: 'text-amber-950',
      description: 'text-amber-700',
    },
    blue: {
      wrapper: 'border-blue-200 bg-blue-50',
      label: 'text-blue-700',
      value: 'text-blue-950',
      description: 'text-blue-700',
    },
  };

  const style = styles[tone];

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${style.wrapper} ${className}`}
    >
      <p className={`text-xs font-semibold uppercase tracking-wide ${style.label}`}>
        {label}
      </p>

      <p className={`mt-2 text-2xl font-bold ${style.value}`}>
        {value}
      </p>

      <p className={`mt-1 text-xs ${style.description}`}>
        {description}
      </p>
    </div>
  );
}