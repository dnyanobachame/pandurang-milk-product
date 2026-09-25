'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function setWhatsAppOptIn(optIn: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' };

  const { error } = await supabase
    .from('profiles')
    .update({ whatsapp_opt_in: optIn, whatsapp_opt_in_at: optIn ? new Date().toISOString() : null })
    .eq('id', user.id);

  if (error) return { error: 'Could not update your WhatsApp preference.' };

  revalidatePath('/dashboard/notifications');
  return { ok: true };
}

/** Called once the browser successfully subscribes via PushManager. */
export async function savePushSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' };

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      subscription,
    },
    { onConflict: 'endpoint' }
  );

  if (error) return { error: 'Could not save your push subscription.' };
  return { ok: true };
}

export async function removePushSubscription(endpoint: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' };

  await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint);
  return { ok: true };
}
