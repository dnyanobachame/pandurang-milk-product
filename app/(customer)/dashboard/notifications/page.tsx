import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WhatsAppOptInToggle } from '@/components/WhatsAppOptInToggle';
import { PushSubscribeToggle } from '@/components/PushSubscribeToggle';

export default async function NotificationSettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from('profiles').select('whatsapp_opt_in, mobile').eq('id', user.id).single(),
    supabase.from('company_settings').select('whatsapp_enabled').limit(1).maybeSingle(),
  ]);

  return (
    <main className="max-w-lg mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Notifications</h1>

      <section className="rounded-xl2 border border-gray-100 bg-white p-5 mb-4">
        <h2 className="font-medium mb-2">Push notifications</h2>
        <p className="text-sm text-gray-500 mb-3">
          Get order and delivery updates on this device, even when the app isn&apos;t open.
        </p>
        <PushSubscribeToggle />
      </section>

      <section className="rounded-xl2 border border-gray-100 bg-white p-5">
        <h2 className="font-medium mb-2">WhatsApp updates</h2>
        {settings?.whatsapp_enabled ? (
          <>
            <p className="text-sm text-gray-500 mb-3">
              {profile?.mobile
                ? `We'll message order updates to ${profile.mobile}.`
                : 'Add a mobile number to your profile to receive WhatsApp updates.'}
            </p>
            <WhatsAppOptInToggle initialOptIn={profile?.whatsapp_opt_in ?? false} />
          </>
        ) : (
          <p className="text-sm text-gray-500">WhatsApp updates aren&apos;t enabled yet.</p>
        )}
      </section>
    </main>
  );
}
