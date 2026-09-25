'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const PACKING_ROLES = ['admin', 'packing_manager', 'packing_staff'];

const CHECKLIST_KEYS = [
  'correct_customer', 'correct_product', 'correct_quantity', 'correct_batch',
  'expiry_checked', 'packaging_intact', 'invoice_included', 'delivery_label_attached',
] as const;

async function requirePackingStaff() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' as const };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !PACKING_ROLES.includes(profile.role)) {
    return { error: 'You are not authorized to do this.' as const };
  }
  return { supabase, user };
}

/** Toggle a single checklist item and move the task into 'packing' if it was still 'pending_packing'. */
export async function toggleChecklistItem(taskId: string, key: (typeof CHECKLIST_KEYS)[number], checked: boolean) {
  const auth = await requirePackingStaff();
  if ('error' in auth) return auth;
  const { supabase } = auth;

  const { data: task } = await supabase.from('packing_tasks').select('checklist, status').eq('id', taskId).single();
  if (!task) return { error: 'Task not found.' };

  const checklist = { ...(task.checklist as Record<string, boolean>), [key]: checked };

  const { error } = await supabase
    .from('packing_tasks')
    .update({
      checklist,
      status: task.status === 'pending_packing' ? 'packing' : task.status,
    })
    .eq('id', taskId);

  if (error) return { error: 'Could not save checklist progress.' };
  revalidatePath('/packing');
  return { ok: true };
}

/**
 * Marks a task Packed — only allowed once every checklist item is true.
 * Also moves the parent order to 'packed' and deducts the sold quantity
 * from inventory (FEFO: earliest-expiry batch first) so stock stays
 * accurate the moment an order leaves packing, not just at delivery.
 */
export async function markTaskPacked(taskId: string) {
  const auth = await requirePackingStaff();
  if ('error' in auth) return auth;
  const { supabase, user } = auth;

  const { data: task } = await supabase
    .from('packing_tasks')
    .select('checklist, order_id, status')
    .eq('id', taskId)
    .single();
  if (!task) return { error: 'Task not found.' };

  const checklist = (task.checklist as Record<string, boolean>) ?? {};
  const complete = CHECKLIST_KEYS.every((k) => checklist[k] === true);
  if (!complete) {
    return { error: 'Complete every checklist item before marking this order packed.' };
  }

  const packageNumber = `PKG-${Date.now().toString(36).toUpperCase()}`;

  const { error: taskError } = await supabase
    .from('packing_tasks')
    .update({ status: 'packed', packed_by: user.id, packed_at: new Date().toISOString(), package_number: packageNumber })
    .eq('id', taskId);
  if (taskError) return { error: 'Could not mark this order as packed.' };

  await supabase.from('orders').update({ order_status: 'packed' }).eq('id', task.order_id);

  // Deduct stock: FEFO across packaging_batches for each ordered product.
  const { data: items } = await supabase
    .from('order_items')
    .select('id, product_id, quantity, batch_id')
    .eq('order_id', task.order_id);

  for (const item of items ?? []) {
    let batchId = item.batch_id;

    if (!batchId) {
      // No batch assigned yet at checkout time — pick the earliest-expiry
      // packaging batch with stock (First Expiry, First Out).
      const { data: batch } = await supabase
        .from('packaging_batches')
        .select('id')
        .eq('product_id', item.product_id)
        .eq('status', 'packed')
        .order('expiry_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      batchId = batch?.id ?? null;

      if (batchId) {
        await supabase.from('order_items').update({ batch_id: batchId }).eq('id', item.id);
      }
    }

    if (batchId) {
      await supabase.from('inventory_movements').insert({
        product_id: item.product_id,
        batch_id: batchId,
        movement_type: 'sale',
        quantity: item.quantity,
        reason: `Order ${task.order_id}`,
        performed_by: user.id,
      });
      await supabase.rpc('adjust_inventory', {
        p_product_id: item.product_id,
        p_batch_id: batchId,
        p_sold: item.quantity,
      });
    }

    await supabase.rpc('decrement_product_stock', { p_product_id: item.product_id, p_quantity: item.quantity });
  }

  revalidatePath('/packing');
  revalidatePath('/admin/inventory');
  return { ok: true };
}
