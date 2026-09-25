'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const INVENTORY_ROLES = ['admin', 'inventory_manager'];

/**
 * Manual stock adjustment (§66 of the spec: every adjustment needs a
 * reason and a recorded user — enforced here via inventory_movements,
 * which is never editable after the fact, only appended to).
 */
export async function adjustInventory(input: {
  productId: string;
  batchId?: string | null;
  quantity: number; // always positive — direction below decides the sign
  direction: 'increase' | 'decrease';
  reasonCategory: 'found' | 'correction' | 'damaged' | 'expired';
  reason: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !INVENTORY_ROLES.includes(profile.role)) {
    return { error: 'You are not authorized to adjust inventory.' };
  }

  if (input.quantity <= 0) return { error: 'Quantity must be greater than zero.' };
  if (!input.reason.trim()) return { error: 'A reason is required for every adjustment.' };

  const movementType = input.direction === 'decrease'
    ? (input.reasonCategory === 'expired' ? 'expiry' : 'damage')
    : 'adjustment';

  const { error: movementError } = await supabase.from('inventory_movements').insert({
    product_id: input.productId,
    batch_id: input.batchId || null,
    movement_type: movementType,
    quantity: input.quantity,
    reason: input.reason,
    performed_by: user.id,
  });
  if (movementError) return { error: 'Could not record this adjustment.' };

  // Roll it into the running total. A decrease always reduces stock; an
  // increase is modeled as a correction to opening_stock (there's no
  // dedicated "found stock" bucket in the schema, and this keeps
  // current_stock's formula — opening + produced + purchased - sold -
  // damaged - expired + returned — correct without adding a column).
  const rpcArgs: Record<string, unknown> = { p_product_id: input.productId, p_batch_id: input.batchId || null };
  if (input.direction === 'decrease') {
    if (input.reasonCategory === 'expired') rpcArgs.p_expired = input.quantity;
    else rpcArgs.p_damaged = input.quantity;
  } else {
    rpcArgs.p_opening = input.quantity;
  }

  const { error: rpcError } = await supabase.rpc('adjust_inventory', rpcArgs);
  if (rpcError) return { error: 'Adjustment logged, but inventory totals could not be updated.' };

  await supabase.rpc(input.direction === 'decrease' ? 'decrement_product_stock' : 'increment_product_stock', {
    p_product_id: input.productId,
    p_quantity: input.quantity,
  });

  revalidatePath('/admin/inventory');
  return { ok: true };
}
