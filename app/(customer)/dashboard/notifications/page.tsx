import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WhatsAppOptInToggle } from '@/components/WhatsAppOptInToggle';
import { PushSubscribeToggle } from '@/components/PushSubscribeToggle';

export const dynamic = 'force-dynamic';

export default async function NotificationSettingsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const [
    { data: profile },
    { data: settings },
    { data: notifications, error: notificationsError },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('whatsapp_opt_in, mobile')
      .eq('id', user.id)
      .single(),

    supabase
      .from('company_settings')
      .select('whatsapp_enabled')
      .limit(1)
      .maybeSingle(),

    supabase
      .from('notifications')
      .select(`
        id,
        title,
        body,
        type,
        reference_id,
        created_at
      `)
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
        {/* Back */}
        <a
          href="/dashboard"
          className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-medium text-gray-600 transition hover:bg-white hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <span aria-hidden="true">←</span>
          Dashboard
        </a>

        {/* Header */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl">
              🔔
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                Account
              </p>

              <h1 className="mt-1 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                Notifications
              </h1>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Delivery alerts, order updates, and notification preferences.
              </p>
            </div>
          </div>
        </section>

        {/* Notification history */}
        <section className="mt-4">
          <div className="mb-3 flex items-end justify-between gap-3 px-1">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Delivery & Order Updates
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Important updates about your orders and deliveries.
              </p>
            </div>

            {(notifications?.length ?? 0) > 0 && (
              <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                {notifications?.length}
              </span>
            )}
          </div>

          {notificationsError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                  !
                </div>

                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Notifications could not be loaded.
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-700">
                    Please refresh the page and try again.
                  </p>
                </div>
              </div>
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">
                🔔
              </div>

              <h3 className="mt-4 text-base font-bold text-gray-900">
                No notifications
              </h3>

              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-gray-500">
                You&apos;ll see order and delivery updates here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const isDelivery = notification.type === 'delivery';

                const isOtp =
                  isDelivery &&
                  notification.title === 'Delivery arriving now';

                return (
                  <article
                    key={notification.id}
                    className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${
                      isOtp
                        ? 'border-brand-200 ring-1 ring-brand-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          isOtp
                            ? 'bg-brand-100 text-brand-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isOtp ? '🚚' : '🔔'}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                          <h3 className="text-sm font-bold text-gray-900">
                            {notification.title}
                          </h3>

                          <time className="shrink-0 text-[11px] text-gray-400">
                            {formatNotificationDate(
                              notification.created_at
                            )}
                          </time>
                        </div>

                        {isOtp ? (
                          <DeliveryOtpNotification
                            body={notification.body}
                          />
                        ) : (
                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">
                            {notification.body}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Notification preferences */}
        <section className="mt-5">
          <div className="mb-3 px-1">
            <h2 className="text-base font-bold text-gray-900">
              Notification Preferences
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Choose how you want to receive updates.
            </p>
          </div>

          {/* Push */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                🔔
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-gray-900">
                  Push notifications
                </h3>

                <p className="mt-1 text-sm leading-5 text-gray-500">
                  Get order and delivery updates on this device, even when the
                  app isn&apos;t open.
                </p>

                <div className="mt-4">
                  <PushSubscribeToggle />
                </div>
              </div>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
                💬
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-gray-900">
                  WhatsApp updates
                </h3>

                {settings?.whatsapp_enabled ? (
                  <>
                    <p className="mt-1 text-sm leading-5 text-gray-500">
                      {profile?.mobile
                        ? `We'll message order updates to ${profile.mobile}.`
                        : 'Add a mobile number to your profile to receive WhatsApp updates.'}
                    </p>

                    <div className="mt-4">
                      <WhatsAppOptInToggle
                        initialOptIn={profile?.whatsapp_opt_in ?? false}
                      />
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-sm leading-5 text-gray-500">
                    WhatsApp updates aren&apos;t enabled yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Bottom actions */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <a
            href="/dashboard"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            Back to Dashboard
          </a>

          <a
            href="/dashboard/settings"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            Account Settings
          </a>
        </div>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* DELIVERY OTP                                                               */
/* -------------------------------------------------------------------------- */

function DeliveryOtpNotification({
  body,
}: {
  body: string;
}) {
  const otpMatch = body.match(
    /(?:code to confirm:|code:)\s*(\d{4,8})/i
  );

  const otp = otpMatch?.[1];

  const messageWithoutOtp = otp
    ? body.replace(otp, '••••••')
    : body;

  return (
    <div className="mt-2">
      <p className="whitespace-pre-line text-sm leading-6 text-gray-600">
        {messageWithoutOtp}
      </p>

      {otp ? (
        <div className="mt-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
            Delivery OTP
          </p>

          <div className="mt-2 rounded-xl border border-gray-100 bg-white px-4 py-3">
            <p className="font-mono text-2xl font-bold tracking-[0.35em] text-gray-900">
              {otp}
            </p>
          </div>

          <p className="mt-2 text-xs leading-5 text-brand-800">
            Share this code with the delivery partner to confirm your
            delivery.
          </p>

          <p className="mt-1 text-[11px] font-medium text-gray-500">
            This code expires 15 minutes after it was generated.
          </p>
        </div>
      ) : (
        <div className="mt-3 rounded-xl bg-gray-50 p-3">
          <p className="text-xs leading-5 text-gray-500">
            Please provide the delivery code shown in this notification to
            the delivery partner.
          </p>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* DATE FORMAT                                                                */
/* -------------------------------------------------------------------------- */

function formatNotificationDate(value: string | null) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}