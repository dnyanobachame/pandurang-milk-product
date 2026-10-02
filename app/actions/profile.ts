
'use server';

import {
  createClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

/**
 * Fields a user may edit about themselves.
 *
 * Deliberately excludes:
 * - role
 * - is_active
 * - must_change_password
 * - created_by
 * - created_at
 * - updated_by
 * - updated_at
 *
 * Security-sensitive account fields are never accepted
 * from the normal profile form.
 */
const UpdateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .max(120, 'Full name is too long'),

  mobile: z
    .string()
    .trim()
    .regex(
      /^[6-9]\d{9}$/,
      'Enter a valid 10-digit Indian mobile number'
    ),

  avatarUrl: z
    .string()
    .trim()
    .url('Enter a valid avatar URL')
    .max(1000, 'Avatar URL is too long')
    .optional()
    .nullable(),
});

/**
 * Update the currently signed-in user's editable profile fields.
 */
export async function updateMyProfile(input: {
  fullName: string;
  mobile: string;
  avatarUrl?: string | null;
}) {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: 'Please sign in again.',
    };
  }

  const parsed = UpdateProfileSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error:
        parsed.error.errors[0]?.message ??
        'Invalid input.',
    };
  }

  /**
   * Verify that the profile exists and the account is active
   * before allowing profile changes.
   */
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select('id, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return {
      error: 'Your account profile could not be loaded.',
    };
  }

  if (profile.is_active === false) {
    return {
      error: 'Your account is inactive.',
      inactive: true,
    };
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.fullName,
      mobile: parsed.data.mobile,
      avatar_url: parsed.data.avatarUrl ?? null,
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('updateMyProfile error:', updateError);

    return {
      error:
        'Could not save your changes. Please try again.',
    };
  }

  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard');
  revalidatePath('/account');

  return {
    ok: true,
  };
}

/**
 * Complete the administrator-created temporary-password setup.
 *
 * IMPORTANT:
 * This is intentionally a separate server action.
 *
 * The browser must NOT directly update:
 *
 *   profiles.must_change_password
 *
 * because a generic UPDATE policy on the user's own profile
 * could otherwise expose more profile columns to client-side
 * updates.
 *
 * This action:
 * 1. Verifies the authenticated user.
 * 2. Verifies the profile exists.
 * 3. Verifies the account is active.
 * 4. Verifies the account actually requires password setup.
 * 5. Uses the server-only service-role client to clear ONLY
 *    must_change_password for this exact user.
 */
export async function completePasswordSetup() {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: 'Your session has expired. Please log in again.',
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select('role, is_active, must_change_password')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return {
      error: 'Your account profile could not be loaded.',
    };
  }

  if (profile.is_active === false) {
    return {
      error: 'Your account is inactive.',
      inactive: true,
    };
  }

  /**
   * Nothing needs to be changed.
   *
   * Returning the role allows the caller to continue its
   * normal post-login routing.
   */
  if (!profile.must_change_password) {
    return {
      ok: true,
      role: profile.role,
    };
  }

  /**
   * Service-role client is server-only.
   *
   * It bypasses RLS, therefore the authorization checks above
   * are essential and must happen before this update.
   */
  const adminSupabase = createServiceRoleClient();

  const { error: updateError } = await adminSupabase
    .from('profiles')
    .update({
      must_change_password: false,
    })
    .eq('id', user.id)
    .eq('must_change_password', true);

  if (updateError) {
    console.error(
      'completePasswordSetup update error:',
      updateError
    );

    return {
      error:
        'Your password was changed, but account setup could not be completed. Please try again.',
    };
  }

  /**
   * Verify the final state using the server-side privileged
   * client rather than trusting the update response alone.
   */
  const {
    data: updatedProfile,
    error: verifyError,
  } = await adminSupabase
    .from('profiles')
    .select('role, is_active, must_change_password')
    .eq('id', user.id)
    .single();

  if (verifyError || !updatedProfile) {
    console.error(
      'completePasswordSetup verification error:',
      verifyError
    );

    return {
      error:
        'Password changed successfully, but your account could not be verified. Please log in again.',
    };
  }

  if (updatedProfile.is_active === false) {
    return {
      error: 'Your account is inactive.',
      inactive: true,
    };
  }

  if (updatedProfile.must_change_password) {
    return {
      error:
        'Account setup is still incomplete. Please try again.',
    };
  }

  revalidatePath('/auth/change-password');
  revalidatePath('/admin/users');
  revalidatePath('/delivery');

  return {
    ok: true,
    role: updatedProfile.role,
  };
}
