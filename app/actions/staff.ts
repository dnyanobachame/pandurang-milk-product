'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import type { AppRole } from '@/lib/roles';

/**
 * Creates a staff account (production, packing, delivery, etc.) via the
 * Supabase Admin API — this is the one place staff accounts should ever be
 * created, never through the public /auth/register customer flow (see
 * README). Requires the *caller* to already be an admin, checked with the
 * caller's own session before we touch the service-role client.
 */
export async function createStaffUser(input: {
  fullName: string;
  email: string;
  mobile?: string;
  role: AppRole;
  vehicleNumber?: string; // only used when role === 'delivery_partner'
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' };

  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!callerProfile || callerProfile.role !== 'admin') {
    return { error: 'Only Admin can create staff accounts.' };
  }

  if (input.role === 'customer') {
    return { error: 'Use this form for staff roles only — customers register themselves.' };
  }

  const tempPassword = randomBytes(9).toString('base64url'); // ~12 chars
  const admin = createServiceRoleClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, mobile: input.mobile },
  });

  if (createError || !created.user) {
    return { error: createError?.message?.includes('already registered')
      ? 'A user with this email already exists.'
      : 'Could not create this account.' };
  }

  // The on_auth_user_created trigger (04_auth_trigger.sql) already inserted
  // a profiles row with role='customer' — overwrite it with the real role.
  const { error: roleError } = await admin
    .from('profiles')
    .update({ role: input.role })
    .eq('id', created.user.id);

  if (roleError) {
    return { error: 'Account created, but the role could not be set. Update it manually in Supabase.' };
  }

  if (input.role === 'delivery_partner') {
    await admin.from('delivery_partners').insert({
      id: created.user.id,
      vehicle_number: input.vehicleNumber || null,
    });
  }

  revalidatePath('/admin/users');
  return { ok: true, tempPassword, email: input.email };
}

export async function setUserActive(userId: string, isActive: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' };

  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!callerProfile || callerProfile.role !== 'admin') {
    return { error: 'Only Admin can do this.' };
  }

  const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', userId);
  if (error) return { error: 'Could not update this account.' };

  revalidatePath('/admin/users');
  return { ok: true };
}
