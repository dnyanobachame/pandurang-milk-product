'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

async function requireProductionStaff() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' as const };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'production_manager', 'accountant'].includes(profile.role)) {
    return { error: 'You are not authorized to do this.' as const };
  }
  return { supabase, user, role: profile.role };
}

export async function createSupplier(input: {
  supplierCode: string;
  name: string;
  mobile: string;
  village: string;
  address?: string;
}) {
  const auth = await requireProductionStaff();
  if ('error' in auth) return auth;
  const { supabase } = auth;

  const { error } = await supabase.from('suppliers').insert({
    supplier_code: input.supplierCode,
    name: input.name,
    mobile: input.mobile,
    village: input.village,
    address: input.address || null,
  });

  if (error) return { error: 'Could not save this supplier. The supplier code may already be in use.' };

  revalidatePath('/admin/suppliers');
  redirect('/admin/suppliers');
}
