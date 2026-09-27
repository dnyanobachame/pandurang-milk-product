'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const PACKING_ROLES = ['admin', 'packing_manager', 'packing_staff'];

const CHECKLIST_KEYS = [
  'correct_customer',
  'correct_product',
  'correct_quantity',
  'correct_batch',
  'expiry_checked',
  'packaging_intact',
  'invoice_included',
  'delivery_label_attached',
] as const;

async function requirePackingStaff() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Please sign in again.' as const };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !PACKING_ROLES.includes(profile.role)) {
    return { error: 'You are not authorized to do this.' as const };
  }

  return { supabase, user };
}

/**
 * Toggle a single checklist item.
 *
 * If the task is still pending_packing, moving the first checklist item
 * to checked automatically changes the task status to packing.
 */
export async function toggleChecklistItem(
  taskId: string,
  key: (typeof CHECKLIST_KEYS)[number],
  checked: boolean
) {
  const auth = await requirePackingStaff();

  if ('error' in auth) {
    return auth;
  }

  const { supabase } = auth;

  const { data: task, error: taskError } = await supabase
    .from('packing_tasks')
    .select('checklist, status')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    return { error: 'Task not found.' };
  }

  const checklist = {
    ...((task.checklist as Record<string, boolean>) ?? {}),
    [key]: checked,
  };

  const nextStatus =
    task.status === 'pending_packing'
      ? 'packing'
      : task.status;

  const { error } = await supabase
    .from('packing_tasks')
    .update({
      checklist,
      status: nextStatus,
    })
    .eq('id', taskId);

  if (error) {
    console.error('TOGGLE PACKING CHECKLIST ERROR:', error);

    return {
      error: 'Could not save checklist progress.',
    };
  }

  revalidatePath('/packing');

  return { ok: true };
}

/**
 * Mark a packing task as packed.
 *
 * IMPORTANT:
 * Inventory, batch allocation, order-item batch assignment,
 * product stock deduction and packing completion are handled
 * by the database transaction `pack_order_transaction`.
 *
 * This prevents the previous bug where the task/order was marked
 * packed before inventory validation completed.
 */
export async function markTaskPacked(taskId: string) {
  const auth = await requirePackingStaff();

  if ('error' in auth) {
    return auth;
  }

  const { supabase, user } = auth;

  /*
   * Fetch the task first so we can validate the checklist
   * before calling the transactional database function.
   */
  const { data: task, error: taskFetchError } = await supabase
    .from('packing_tasks')
    .select('checklist, order_id, status')
    .eq('id', taskId)
    .single();

  if (taskFetchError || !task) {
    console.error(
      'PACKING TASK FETCH ERROR:',
      taskFetchError
    );

    return {
      error: 'Packing task not found.',
    };
  }

  if (task.status === 'packed') {
    return {
      error: 'This order is already packed.',
    };
  }

  /*
   * Validate all required checklist items.
   */
  const checklist =
    (task.checklist as Record<string, boolean>) ?? {};

  const complete = CHECKLIST_KEYS.every(
    (key) => checklist[key] === true
  );

  if (!complete) {
    return {
      error:
        'Complete every checklist item before marking this order packed.',
    };
  }

  /*
   * Generate a unique package number.
   */
  const packageNumber =
    `PKG-${Date.now().toString(36).toUpperCase()}`;

  /*
   * IMPORTANT:
   *
   * The database function performs the complete transaction:
   *
   * 1. Locks the packing task
   * 2. Validates the order
   * 3. Validates every order item
   * 4. Requires packaging inventory for batch-tracked products
   * 5. Uses FEFO batch allocation
   * 6. Records inventory movement
   * 7. Updates batch inventory sold quantity
   * 8. Decreases product available quantity
   * 9. Marks packing task packed
   * 10. Marks order packed
   *
   * If any operation fails, PostgreSQL rolls back the
   * complete transaction.
   */
  const { data, error } = await supabase.rpc(
    'pack_order_transaction',
    {
      p_task_id: taskId,
      p_packed_by: user.id,
      p_package_number: packageNumber,
    }
  );

  if (error) {
    console.error(
      'PACK ORDER TRANSACTION ERROR:',
      error
    );

    return {
      error:
        error.message ||
        'Could not complete packing. No inventory or order changes were made.',
    };
  }

  /*
   * The RPC returns:
   *
   * {
   *   ok: true,
   *   order_id: "...",
   *   task_id: "...",
   *   package_number: "..."
   * }
   */
  if (!data?.ok) {
    return {
      error:
        'Packing could not be completed. No inventory or order changes were made.',
    };
  }

  /*
   * Refresh all relevant pages after successful packing.
   */
  revalidatePath('/packing');
  revalidatePath('/admin/inventory');
  revalidatePath('/admin/orders');
  revalidatePath(`/dashboard/orders/${task.order_id}`);

  return {
    ok: true,
    packageNumber,
  };
}