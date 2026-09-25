import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function SupportPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('id, ticket_number, category, description, status, resolution, created_at')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <main className="max-w-lg mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Support</h1>
        <Link href="/dashboard/support/new" className="text-sm rounded-full bg-brand-600 text-white px-4 py-2">
          + New Request
        </Link>
      </div>

      <div className="space-y-3">
        {(tickets ?? []).map((t) => (
          <div key={t.id} className="rounded-xl2 border border-gray-100 bg-white p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-mono text-xs text-gray-400">{t.ticket_number}</p>
                <p className="font-medium capitalize">{t.category}</p>
              </div>
              <StatusBadge status={t.status} />
            </div>
            <p className="text-sm text-gray-600 mt-2">{t.description}</p>
            {t.resolution && (
              <p className="text-sm text-brand-700 mt-2 border-t border-gray-50 pt-2">
                <strong>Resolution:</strong> {t.resolution}
              </p>
            )}
          </div>
        ))}
        {(!tickets || tickets.length === 0) && (
          <p className="text-gray-500 text-sm">No support requests yet.</p>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-amber-50 text-amber-700',
    in_progress: 'bg-blue-50 text-blue-700',
    resolved: 'bg-brand-50 text-brand-700',
    closed: 'bg-gray-100 text-gray-500',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${styles[status] ?? ''}`}>{status.replace('_', ' ')}</span>;
}
