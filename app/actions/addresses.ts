'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { AddressInputSchema, type AddressInput } from '@/lib/address-schema';

type Result = { ok: true } | { error: string };

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function refresh() {
  revalidatePath('/dashboard/addresses');
  revalidatePath('/checkout');
}

/**
 * Create (no id) or edit (with id) one of the signed-in customer's
 * addresses. customer_id always comes from the session — never from the
 * browser — and edits are additionally scoped with .eq('customer_id', …)
 * so this stays safe even if RLS were ever loosened.
 */
export async function saveAddress(input: AddressInput, id?: string): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: 'Please sign in again.' };

  if (id !== undefined && !z.string().uuid().safeParse(id).success) {
    return { error: 'Address not found.' };
  }

  const parsed = AddressInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Please check the address details.' };
  }
  const v = parsed.data;

  const fields = {
    label: v.label,
    recipient_name: v.recipientName,
    phone: v.phone,
    address_line: v.addressLine,
    address_line_2: v.addressLine2,
    landmark: v.landmark,
    village_city: v.villageCity,
    taluka: v.taluka,
    district: v.district,
    state: v.state,
    pin_code: v.pinCode,
    delivery_instructions: v.deliveryInstructions,
  };

  if (id) {
    // Only ever *set* the default here; un-defaulting happens by choosing a
    // different default (the DB trigger clears the previous one).
    const update = v.isDefault ? { ...fields, is_default: true } : fields;
    const { data, error } = await supabase
      .from('customer_addresses')
      .update(update)
      .eq('id', id)
      .eq('customer_id', user.id)
      .select('id');

    if (error) {
      console.error('[addresses] update failed', error.code, error.message);
      return { error: 'Could not save this address. Please try again.' };
    }
    if (!data || data.length === 0) return { error: 'Address not found.' };
  } else {
    const { count } = await supabase
      .from('customer_addresses')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', user.id);

    const { error } = await supabase.from('customer_addresses').insert({
      ...fields,
      customer_id: user.id,
      // The first address a customer saves is always their default.
      is_default: v.isDefault || (count ?? 0) === 0,
    });

    if (error) {
      console.error('[addresses] insert failed', error.code, error.message);
      return { error: 'Could not save this address. Please try again.' };
    }
  }

  refresh();
  return { ok: true };
}

export async function setDefaultAddress(id: string): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: 'Please sign in again.' };
  if (!z.string().uuid().safeParse(id).success) return { error: 'Address not found.' };

  const { data, error } = await supabase
    .from('customer_addresses')
    .update({ is_default: true })
    .eq('id', id)
    .eq('customer_id', user.id)
    .select('id');

  if (error) {
    console.error('[addresses] set default failed', error.code, error.message);
    return { error: 'Could not change your default address. Please try again.' };
  }
  if (!data || data.length === 0) return { error: 'Address not found.' };

  refresh();
  return { ok: true };
}

export async function deleteAddress(id: string): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: 'Please sign in again.' };
  if (!z.string().uuid().safeParse(id).success) return { error: 'Address not found.' };

  const { data: existing } = await supabase
    .from('customer_addresses')
    .select('id, is_default')
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle();
  if (!existing) return { error: 'Address not found.' };

  const { error } = await supabase
    .from('customer_addresses')
    .delete()
    .eq('id', id)
    .eq('customer_id', user.id);

  if (error) {
    console.error('[addresses] delete failed', error.code, error.message);
    // 23503 = foreign_key_violation: an order or subscription still points
    // at this address (orders keep a live reference until the Phase 5
    // address-snapshot change lands).
    if (error.code === '23503') {
      return {
        error:
          "This address is linked to an existing order or subscription, so it can't be deleted yet.",
      };
    }
    return { error: 'Could not delete this address. Please try again.' };
  }

  // Don't leave a customer with addresses but no default.
  if (existing.is_default) {
    const { data: next } = await supabase
      .from('customer_addresses')
      .select('id')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (next) {
      await supabase
        .from('customer_addresses')
        .update({ is_default: true })
        .eq('id', next.id)
        .eq('customer_id', user.id);
    }
  }

  refresh();
  return { ok: true };
}
