'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const PushSubscriptionSchema = z.object({
  endpoint: z
    .string()
    .trim()
    .url()
    .max(2048),
  keys: z.object({
    p256dh: z
      .string()
      .trim()
      .min(1)
      .max(512),
    auth: z
      .string()
      .trim()
      .min(1)
      .max(512),
  }),
});

const EndpointSchema = z
  .string()
  .trim()
  .url()
  .max(2048);

export async function setWhatsAppOptIn(
  optIn: boolean,
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: 'Please sign in again.',
    };
  }

  if (typeof optIn !== 'boolean') {
    return {
      error: 'Invalid WhatsApp preference.',
    };
  }

  const {
    error,
  } = await supabase
    .from('profiles')
    .update({
      whatsapp_opt_in: optIn,
      whatsapp_opt_in_at: optIn
        ? new Date().toISOString()
        : null,
    })
    .eq('id', user.id);

  if (error) {
    console.error(
      '[notifications] WhatsApp preference update failed:',
      error.code,
      error.message,
    );

    return {
      error:
        'Could not update your WhatsApp preference.',
    };
  }

  revalidatePath(
    '/dashboard/notifications',
  );

  return {
    ok: true,
  };
}

/**
 * Called once the browser successfully subscribes
 * via PushManager.
 */
export async function savePushSubscription(
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  },
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: 'Please sign in again.',
    };
  }

  const parsed =
    PushSubscriptionSchema.safeParse(
      subscription,
    );

  if (!parsed.success) {
    return {
      error:
        'Invalid push notification subscription.',
    };
  }

  const value = parsed.data;

  const { error } =
    await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint: value.endpoint,
          subscription: {
            endpoint: value.endpoint,
            keys: value.keys,
          },
        },
        {
          onConflict: 'endpoint',
        },
      );

  if (error) {
    console.error(
      '[notifications] Push subscription save failed:',
      error.code,
      error.message,
    );

    return {
      error:
        'Could not save your push subscription.',
    };
  }

  return {
    ok: true,
  };
}

export async function removePushSubscription(
  endpoint: string,
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: 'Please sign in again.',
    };
  }

  const parsed =
    EndpointSchema.safeParse(endpoint);

  if (!parsed.success) {
    return {
      error: 'Invalid push subscription.',
    };
  }

  const {
    error,
  } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', parsed.data);

  if (error) {
    console.error(
      '[notifications] Push subscription removal failed:',
      error.code,
      error.message,
    );

    return {
      error:
        'Could not remove your push subscription.',
    };
  }

  return {
    ok: true,
  };
}