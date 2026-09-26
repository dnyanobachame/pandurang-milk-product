'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

/**
 * Fields a user may edit about themselves. Deliberately excludes role,
 * is_active, created_by, created_at, updated_by — those are protected
 * both here (never accepted as input) and at the database level (see
 * supabase/12_security_fixes.sql, which blocks them even on a direct
 * SQL update bypassing this action entirely).
 */
const UpdateProfileSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(120),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  avatarUrl: z.string().url().optional().nullable(),
});

export async function updateMyProfile(input: {
  fullName: string;
  mobile: string;
  avatarUrl?: string | null;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Please sign in again.' };
  }

  const parsed = UpdateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.fullName,
      mobile: parsed.data.mobile,
      avatar_url: parsed.data.avatarUrl ?? null,
    })
    // Redundant with RLS (id = auth.uid()), kept explicit so this action's
    // safety doesn't silently depend on RLS alone.
    .eq('id', user.id);

  if (error) {
    // Never surface raw Postgres error text (e.g. constraint names) to
    // the user.
    return { error: 'Could not save your changes. Please try again.' };
  }

  revalidatePath('/dashboard/settings');
  return { ok: true };
}
