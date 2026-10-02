
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const EnabledSchema = z.boolean();

async function requireActiveAdmin() {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: 'Please sign in again.' as const,
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (
    profileError ||
    !profile ||
    profile.role !== 'admin' ||
    profile.is_active !== true
  ) {
    return {
      error:
        'Only an active Admin can change this setting.' as const,
    };
  }

  return {
    supabase,
    user,
  };
}

export async function toggleWhatsAppEnabled(
  enabled: boolean
) {
  const auth =
    await requireActiveAdmin();

  if ('error' in auth) {
    return auth;
  }

  const parsed =
    EnabledSchema.safeParse(enabled);

  if (!parsed.success) {
    return {
      error: 'Invalid WhatsApp setting value.',
    };
  }

  /**
   * The application currently expects one
   * company_settings row.
   */
  const {
    data: existing,
    error: existingError,
  } =
    await auth.supabase
      .from('company_settings')
      .select('id, whatsapp_enabled')
      .limit(1)
      .maybeSingle();

  if (existingError) {
    console.error(
      '[whatsapp-settings] settings lookup failed:',
      existingError.message
    );

    return {
      error:
        'Could not load company settings.',
    };
  }

  if (!existing) {
    return {
      error:
        'Company settings not found.',
    };
  }

  /**
   * Avoid an unnecessary database write when
   * the requested state is already active.
   */
  if (
    existing.whatsapp_enabled ===
    parsed.data
  ) {
    revalidatePath('/admin/whatsapp');

    return {
      ok: true,
    };
  }

  const {
    data: updated,
    error: updateError,
  } =
    await auth.supabase
      .from('company_settings')
      .update({
        whatsapp_enabled: parsed.data,
      })
      .eq('id', existing.id)
      .eq(
        'whatsapp_enabled',
        existing.whatsapp_enabled
      )
      .select('id')
      .maybeSingle();

  if (updateError) {
    console.error(
      '[whatsapp-settings] update failed:',
      updateError.message
    );

    return {
      error:
        'Could not update this setting. Please try again.',
    };
  }

  if (!updated) {
    return {
      error:
        'The WhatsApp setting changed before this request completed. Please refresh and try again.',
    };
  }

  revalidatePath('/admin/whatsapp');

  return {
    ok: true,
  };
}
