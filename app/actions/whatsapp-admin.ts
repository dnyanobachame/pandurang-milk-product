'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function toggleWhatsAppEnabled(enabled: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') {
    return { error: 'Only Admin can change this setting.' };
  }

  const { data: existing } = await supabase.from('company_settings').select('id').limit(1).maybeSingle();
  if (!existing) return { error: 'Company settings not found.' };

  const { error } = await supabase
    .from('company_settings')
    .update({ whatsapp_enabled: enabled })
    .eq('id', existing.id);

  if (error) return { error: 'Could not update this setting.' };

  revalidatePath('/admin/whatsapp');
  return { ok: true };
}
