import { createClient } from '@/lib/supabase/server';
import { WhatsAppEnabledToggle } from '@/components/admin/WhatsAppEnabledToggle';

export default async function AdminWhatsAppPage() {
  const supabase = createClient();

  const [{ data: settings }, { count: optedInCount }, { data: recentMessages }] = await Promise.all([
    supabase.from('company_settings').select('whatsapp_enabled').limit(1).maybeSingle(),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('whatsapp_opt_in', true),
    supabase
      .from('whatsapp_messages')
      .select('id, template_name, body, status, created_at, profiles(full_name, mobile)')
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">WhatsApp</h1>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl2 border border-gray-100 bg-white p-4">
          <p className="text-xs text-gray-500 mb-2">Sending order updates via WhatsApp</p>
          <WhatsAppEnabledToggle initialEnabled={settings?.whatsapp_enabled ?? false} />
        </div>
        <div className="rounded-xl2 border border-gray-100 bg-white p-4">
          <p className="text-xs text-gray-500">Opted-in customers</p>
          <p className="text-xl font-semibold mt-1">{optedInCount ?? 0}</p>
        </div>
      </div>

      {!settings?.whatsapp_enabled && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl2 p-3 mb-6">
          WhatsApp is currently disabled — order updates are only sent in-app until you turn this on.
          Make sure <code className="text-xs">WHATSAPP_API_URL</code>, <code className="text-xs">WHATSAPP_ACCESS_TOKEN</code>,
          and <code className="text-xs">WHATSAPP_PHONE_NUMBER_ID</code> are configured before enabling.
        </p>
      )}

      <h2 className="font-medium text-gray-700 mb-3">Recent Messages</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 pr-4">Customer</th>
              <th className="py-2 pr-4">Template</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Sent</th>
            </tr>
          </thead>
          <tbody>
            {(recentMessages ?? []).map((m: any) => (
              <tr key={m.id} className="border-b border-gray-50">
                <td className="py-2 pr-4">{m.profiles?.full_name ?? '—'}</td>
                <td className="py-2 pr-4 capitalize">{m.template_name ?? '—'}</td>
                <td className="py-2 pr-4">
                  <StatusBadge status={m.status} />
                </td>
                <td className="py-2 pr-4 text-gray-500">
                  {new Date(m.created_at).toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
            {(!recentMessages || recentMessages.length === 0) && (
              <tr><td colSpan={4} className="py-6 text-gray-500 text-center">No WhatsApp messages sent yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    queued: 'bg-gray-100 text-gray-600',
    sent: 'bg-blue-50 text-blue-700',
    delivered: 'bg-brand-50 text-brand-700',
    read: 'bg-brand-100 text-brand-800',
    failed: 'bg-red-50 text-red-700',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${styles[status] ?? ''}`}>{status}</span>;
}
