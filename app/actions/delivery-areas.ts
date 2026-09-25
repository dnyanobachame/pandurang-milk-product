'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const DELIVERY_ROLES = ['admin', 'delivery_manager'];

async function requireDeliveryManager() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' as const };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !DELIVERY_ROLES.includes(profile.role)) {
    return { error: 'You are not authorized to do this.' as const };
  }
  return { supabase };
}

export async function createDeliveryArea(input: {
  cityOrVillage: string;
  pinCode?: string;
  deliveryFee: number;
  freeDeliveryAbove?: number;
  minOrderAmount?: number;
}) {
  const auth = await requireDeliveryManager();
  if ('error' in auth) return auth;
  const { supabase } = auth;

  const { error } = await supabase.from('delivery_areas').insert({
    city_or_village: input.cityOrVillage,
    pin_code: input.pinCode || null,
    delivery_fee: input.deliveryFee,
    free_delivery_above: input.freeDeliveryAbove ?? null,
    min_order_amount: input.minOrderAmount ?? 0,
    is_active: true,
  });
  if (error) return { error: 'Could not save this delivery area.' };

  revalidatePath('/admin/delivery/areas');
  return { ok: true };
}

export async function toggleAreaActive(areaId: string, isActive: boolean) {
  const auth = await requireDeliveryManager();
  if ('error' in auth) return auth;
  const { supabase } = auth;

  const { error } = await supabase.from('delivery_areas').update({ is_active: isActive }).eq('id', areaId);
  if (error) return { error: 'Could not update this area.' };

  revalidatePath('/admin/delivery/areas');
  return { ok: true };
}

export async function updateDeliveryFee(areaId: string, deliveryFee: number, freeDeliveryAbove: number | null) {
  const auth = await requireDeliveryManager();
  if ('error' in auth) return auth;
  const { supabase } = auth;

  const { error } = await supabase
    .from('delivery_areas')
    .update({ delivery_fee: deliveryFee, free_delivery_above: freeDeliveryAbove })
    .eq('id', areaId);
  if (error) return { error: 'Could not update pricing for this area.' };

  revalidatePath('/admin/delivery/areas');
  return { ok: true };
}
