import { createClient } from '@/lib/supabase/server';
import { ResolveTicketForm } from '@/components/admin/ResolveTicketForm';

export const dynamic = 'force-dynamic';

type SupportTicket = {
  id: string;
  ticket_number: string;
  category: string | null;
  description: string | null;
  status: string | null;
  created_at: string;
  profiles:
    | { full_name: string | null; mobile: string | null }
    | { full_name: string | null; mobile: string | null }[]
    | null;
};

function firstProfile(
  value: SupportTicket['profiles'],
): { full_name: string | null; mobile: string | null } | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function statusClasses(status: string | null) {
  const value = (status ?? '').toLowerCase();

  if (value === 'resolved' || value === 'closed') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (value === 'pending' || value === 'open' || value === 'in_progress') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';

  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdminSupportPage() {
  const supabase = createClient();

  const { data: tickets, error } = await supabase
    .from('support_tickets')
    .select(
      'id, ticket_number, category, description, status, created_at, profiles!support_tickets_customer_id_fkey(full_name, mobile)',
    )
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = (tickets ?? []) as SupportTicket[];

  const open = rows.filter(
    (t) => t.status !== 'resolved' && t.status !== 'closed',
  );

  const resolved = rows.filter(
    (t) => t.status === 'resolved' || t.status === 'closed',
  );

  const pending = rows.filter((t) => {
    const status = (t.status ?? '').toLowerCase();
    return status === 'pending' || status === 'open';
  });

  const inProgress = rows.filter(
    (t) => (t.status ?? '').toLowerCase() === 'in_progress',
  );

  return (
    <div className="w-full space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Customer Service
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Support Queue
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            Review customer support tickets, resolve open issues, and keep the
            service queue up to date.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Latest 50
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {rows.length} tickets
          </p>
        </div>
      </section>

      {error ? (
        <section
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
        >
          Could not load the support queue.
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{rows.length}</p>
          <p className="mt-1 text-xs text-slate-500">Latest 50 tickets</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Open
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-900">{open.length}</p>
          <p className="mt-1 text-xs text-amber-700">Needs attention</p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            In Progress
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-900">
            {inProgress.length}
          </p>
          <p className="mt-1 text-xs text-blue-700">Being handled</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Resolved
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-900">
            {resolved.length}
          </p>
          <p className="mt-1 text-xs text-emerald-700">Resolved or closed</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
                Active Queue
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                Open Tickets
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {open.length} requiring attention
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {open.length > 0 ? (
            open.map((ticket) => {
              const profile = firstProfile(ticket.profiles);

              return (
                <article
                  key={ticket.id}
                  className="p-5 transition hover:bg-slate-50/70 sm:px-6"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500">
                          {ticket.ticket_number}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses(
                            ticket.status,
                          )}`}
                        >
                          {(ticket.status ?? 'open').replaceAll('_', ' ')}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">
                          {ticket.category ?? 'General'}
                        </span>
                      </div>

                      <h3 className="mt-3 text-sm font-semibold text-slate-900">
                        {profile?.full_name ?? 'Customer not recorded'}
                      </h3>

                      {profile?.mobile ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {profile.mobile}
                        </p>
                      ) : null}

                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {ticket.description ?? 'No description provided.'}
                      </p>

                      <p className="mt-3 text-xs text-slate-400">
                        Created {formatDateTime(ticket.created_at)}
                      </p>
                    </div>

                    <div className="shrink-0 lg:min-w-[180px]">
                      <ResolveTicketForm ticketId={ticket.id} />
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="p-10 text-center">
              <p className="font-semibold text-slate-900">No open tickets</p>
              <p className="mt-1 text-sm text-slate-500">
                The support queue currently has no unresolved tickets.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Completed
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                Resolved Tickets
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {resolved.length} resolved or closed
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {resolved.length > 0 ? (
            resolved.map((ticket) => {
              const profile = firstProfile(ticket.profiles);

              return (
                <div
                  key={ticket.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-500">
                        {ticket.ticket_number}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses(
                          ticket.status,
                        )}`}
                      >
                        {(ticket.status ?? 'resolved').replaceAll('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {profile?.full_name ?? 'Customer not recorded'}
                    </p>
                    <p className="mt-1 text-xs capitalize text-slate-500">
                      {ticket.category ?? 'General'}
                    </p>
                  </div>

                  <p className="shrink-0 text-xs text-slate-400">
                    {formatDateTime(ticket.created_at)}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">
              No resolved tickets yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
