import { createClient } from '@/lib/supabase/server';
import { ResolveTicketForm } from '@/components/admin/ResolveTicketForm';

export default async function AdminSupportPage() {
  const supabase = createClient();

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('id, ticket_number, category, description, status, created_at, profiles!support_tickets_customer_id_fkey(full_name, mobile)')
    .order('created_at', { ascending: false })
    .limit(50);

  const open = (tickets ?? []).filter((t) => t.status !== 'resolved' && t.status !== 'closed');
  const resolved = (tickets ?? []).filter((t) => t.status === 'resolved' || t.status === 'closed');

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Support Queue</h1>

      <section className="mb-10">
        <h2 className="font-medium text-gray-700 mb-3">Open ({open.length})</h2>
        <div className="space-y-3">
          {open.map((t: any) => (
            <div key={t.id} className="rounded-xl2 border border-amber-200 bg-amber-50 p-4">
              <p className="font-mono text-xs text-gray-500">{t.ticket_number}</p>
              <p className="font-medium capitalize">{t.category} — {t.profiles?.full_name}</p>
              <p className="text-sm text-gray-600 mt-1">{t.description}</p>
              <ResolveTicketForm ticketId={t.id} />
            </div>
          ))}
          {open.length === 0 && <p className="text-gray-500 text-sm">No open tickets.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-medium text-gray-700 mb-3">Resolved</h2>
        <div className="space-y-2">
          {resolved.map((t: any) => (
            <div key={t.id} className="rounded-xl2 border border-gray-100 bg-white p-3 text-sm">
              <span className="font-mono text-xs text-gray-400">{t.ticket_number}</span> — {t.profiles?.full_name} — {t.category}
            </div>
          ))}
          {resolved.length === 0 && <p className="text-gray-500 text-sm">No resolved tickets yet.</p>}
        </div>
      </section>
    </main>
  );
}
