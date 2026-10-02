import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function SupportPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select(
      'id, ticket_number, category, description, status, resolution, created_at'
    )
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

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
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl">
                💬
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                  Customer Care
                </p>

                <h1 className="mt-1 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                  Support
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  Get help with your orders, deliveries, payments, or products.
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/support/new"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              + New Request
            </Link>
          </div>
        </section>

        {/* Tickets */}
        <section className="mt-4">
          {tickets && tickets.length > 0 ? (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <article
                  key={ticket.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-medium text-gray-400">
                        {ticket.ticket_number}
                      </p>

                      <h2 className="mt-1 text-base font-bold capitalize text-gray-900">
                        {ticket.category.replace(/_/g, ' ')}
                      </h2>

                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(ticket.created_at).toLocaleString('en-IN')}
                      </p>
                    </div>

                    <StatusBadge status={ticket.status} />
                  </div>

                  <div className="mt-4 rounded-xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Your Request
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                      {ticket.description}
                    </p>
                  </div>

                  {ticket.resolution && (
                    <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                        Resolution
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-brand-900">
                        {ticket.resolution}
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-10 text-center shadow-sm sm:px-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-2xl">
                💬
              </div>

              <h2 className="mt-4 text-lg font-bold text-gray-900">
                No support requests yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                If you need help with an order, delivery, payment, or product,
                you can create a support request.
              </p>

              <Link
                href="/dashboard/support/new"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                Create Support Request →
              </Link>
            </div>
          )}
        </section>

        {/* Bottom actions */}
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'border-amber-200 bg-amber-50 text-amber-700',
    in_progress: 'border-blue-200 bg-blue-50 text-blue-700',
    resolved: 'border-brand-200 bg-brand-50 text-brand-700',
    closed: 'border-gray-200 bg-gray-100 text-gray-500',
  };

  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${
        styles[status] ?? 'border-gray-200 bg-gray-100 text-gray-600'
      }`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}