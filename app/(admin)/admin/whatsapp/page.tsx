import { createClient } from '@/lib/supabase/server';
import { WhatsAppEnabledToggle } from '@/components/admin/WhatsAppEnabledToggle';

export const dynamic = 'force-dynamic';

type WhatsAppProfile =
  | { full_name: string | null; mobile: string | null }
  | { full_name: string | null; mobile: string | null }[]
  | null;

type WhatsAppMessage = {
  id: string;
  template_name: string | null;
  body: string | null;
  status: string | null;
  created_at: string;
  profiles: WhatsAppProfile;
};

function firstProfile(value: WhatsAppProfile) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function statusClasses(status: string | null) {
  switch ((status ?? '').toLowerCase()) {
    case 'sent':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'delivered':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'read':
      return 'border-violet-200 bg-violet-50 text-violet-700';
    case 'failed':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'queued':
      return 'border-slate-200 bg-slate-100 text-slate-600';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
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

export default async function AdminWhatsAppPage() {
  const supabase = createClient();

  const [
    { data: settings, error: settingsError },
    { count: optedInCount, error: optedInError },
    { data: recentMessages, error: messagesError },
  ] = await Promise.all([
    supabase
      .from('company_settings')
      .select('whatsapp_enabled')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('whatsapp_opt_in', true),
    supabase
      .from('whatsapp_messages')
      .select(
        'id, template_name, body, status, created_at, profiles(full_name, mobile)',
      )
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  const messages = (recentMessages ?? []) as WhatsAppMessage[];
  const sentCount = messages.filter(
    (message) => (message.status ?? '').toLowerCase() === 'sent',
  ).length;
  const deliveredCount = messages.filter(
    (message) => (message.status ?? '').toLowerCase() === 'delivered',
  ).length;
  const failedCount = messages.filter(
    (message) => (message.status ?? '').toLowerCase() === 'failed',
  ).length;

  const hasError = Boolean(settingsError || optedInError || messagesError);
  const whatsappEnabled = settings?.whatsapp_enabled ?? false;

  return (
    <div className="w-full space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Customer Communication
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            WhatsApp
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            Control WhatsApp order updates and review the latest messages sent
            to customers.
          </p>
        </div>

        <div
          className={`rounded-xl border px-4 py-3 shadow-sm ${
            whatsappEnabled
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
              whatsappEnabled ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            Service status
          </p>
          <p
            className={`mt-1 text-sm font-semibold ${
              whatsappEnabled ? 'text-emerald-900' : 'text-amber-900'
            }`}
          >
            {whatsappEnabled ? 'Enabled' : 'Disabled'}
          </p>
        </div>
      </section>

      {hasError ? (
        <section
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
        >
          Some WhatsApp dashboard data could not be loaded. The controls and
          available records are still shown.
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Service
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {whatsappEnabled ? 'On' : 'Off'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Order update sending</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Opted In
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {optedInCount ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500">Customers available</p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Delivered
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-900">
            {deliveredCount}
          </p>
          <p className="mt-1 text-xs text-blue-700">In latest 30 messages</p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
            Failed
          </p>
          <p className="mt-2 text-2xl font-bold text-red-900">
            {failedCount}
          </p>
          <p className="mt-1 text-xs text-red-700">In latest 30 messages</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sending Controls
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              Order Updates via WhatsApp
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Enable or disable WhatsApp order updates from the admin console.
            </p>
          </div>

          <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <WhatsAppEnabledToggle initialEnabled={whatsappEnabled} />
          </div>
        </div>
      </section>

      {!whatsappEnabled ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
          <p className="font-semibold text-amber-900">
            WhatsApp is currently disabled.
          </p>
          <p className="mt-1 text-sm leading-6 text-amber-800">
            Order updates are only sent in-app until WhatsApp is enabled.
            Before turning it on, make sure{' '}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">
              WHATSAPP_API_URL
            </code>
            ,{' '}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">
              WHATSAPP_ACCESS_TOKEN
            </code>
            , and{' '}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">
              WHATSAPP_PHONE_NUMBER_ID
            </code>{' '}
            are configured.
          </p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Message History
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                Recent Messages
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Latest {messages.length} of 30
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 sm:px-6">Customer</th>
                <th className="px-5 py-3">Template</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {messages.length > 0 ? (
                messages.map((message) => {
                  const profile = firstProfile(message.profiles);

                  return (
                    <tr
                      key={message.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4 sm:px-6">
                        <p className="font-semibold text-slate-900">
                          {profile?.full_name ?? '—'}
                        </p>
                        {profile?.mobile ? (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {profile.mobile}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {message.template_name ?? '—'}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses(
                            message.status,
                          )}`}
                        >
                          {(message.status ?? 'unknown').replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {formatDateTime(message.created_at)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center sm:px-6"
                  >
                    <p className="font-semibold text-slate-900">
                      No WhatsApp messages yet
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Sent message history will appear here.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
