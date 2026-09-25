import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { sendPushNotification } from '@/lib/push';

/**
 * Fans a customer-facing event out to every channel they're eligible for.
 * Uses the service-role client because this is called from a mix of
 * customer-triggered actions (placing an order) and staff-triggered ones
 * (marking packed, confirming delivery) — the in-app `notifications` insert
 * policy is staff-only (see 02_rls.sql), so a customer-triggered call would
 * otherwise fail RLS. This is the one place in the app that's allowed to
 * write notifications on a user's behalf regardless of who's calling it;
 * every call site is still gated by its own role check before it gets here.
 *
 * Never throws — a failed WhatsApp/push send should never break the order
 * flow that triggered it. Errors are swallowed per-channel.
 */
export async function notifyCustomer(input: {
  customerId: string;
  title: string;
  body: string;
  type: string;
  referenceId?: string;
  /** Only sent if the customer has opted in AND company_settings.whatsapp_enabled. Defaults to `body`. */
  whatsappBody?: string;
  pushUrl?: string;
}) {
  const admin = createServiceRoleClient();

  // 1. In-app notification — always.
  await admin.from('notifications').insert({
    recipient_id: input.customerId,
    title: input.title,
    body: input.body,
    type: input.type,
    reference_id: input.referenceId ?? null,
  });

  // 2. WhatsApp — only if the customer opted in and Admin has it enabled.
  const [{ data: profile }, { data: settings }] = await Promise.all([
    admin.from('profiles').select('mobile, whatsapp_opt_in').eq('id', input.customerId).single(),
    admin.from('company_settings').select('whatsapp_enabled').limit(1).maybeSingle(),
  ]);

  if (profile?.whatsapp_opt_in && settings?.whatsapp_enabled && profile.mobile) {
    const result = await sendWhatsAppMessage(profile.mobile, input.whatsappBody ?? input.body);
    await admin.from('whatsapp_messages').insert({
      customer_id: input.customerId,
      template_name: input.type,
      body: input.whatsappBody ?? input.body,
      status: result.ok ? 'sent' : 'failed',
      reference_order_id: input.referenceId ?? null,
      provider_message_id: result.ok ? result.providerMessageId : null,
    });
  }

  // 3. Web push — to every device the customer has subscribed on.
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('user_id', input.customerId);

  for (const sub of subs ?? []) {
    const result = await sendPushNotification(sub.subscription as any, {
      title: input.title,
      body: input.body,
      url: input.pushUrl ?? '/dashboard/orders',
    });
    if (result.expired) {
      await admin.from('push_subscriptions').delete().eq('id', sub.id);
    }
  }
}
