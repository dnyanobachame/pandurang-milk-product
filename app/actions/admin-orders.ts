'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const ORDER_MANAGER_ROLES = [
  'admin',
  'sales_manager',
  'customer_support',
] as const;

type OrderManagerRole = (typeof ORDER_MANAGER_ROLES)[number];

function isOrderManagerRole(
  role: string | null | undefined,
): role is OrderManagerRole {
  return (
    typeof role === 'string' &&
    (ORDER_MANAGER_ROLES as readonly string[]).includes(role)
  );
}

async function requireOrderManager() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (
    profileError ||
    !profile ||
    profile.is_active === false ||
    !isOrderManagerRole(profile.role)
  ) {
    throw new Error('You are not allowed to manage orders.');
  }

  return {
    supabase,
    user,
  };
}

function cleanOrderId(orderId: string) {
  return String(orderId ?? '').trim();
}

/**
 * Confirm a COD order after the admin has contacted
 * the customer and the customer has confirmed the purchase.
 *
 * COD:
 * placed → confirmed
 *
 * UPI:
 * payment must already be paid before confirmation.
 */
export async function confirmCustomerOrder(
  orderId: string,
) {
  const {
    supabase,
    user,
  } = await requireOrderManager();

  const cleanId = cleanOrderId(orderId);

  if (!cleanId) {
    return {
      error: 'Invalid order ID.',
    };
  }

  const {
    data: order,
    error: orderError,
  } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      order_status,
      payment_method,
      payment_status
    `)
    .eq('id', cleanId)
    .single();

  if (orderError || !order) {
    return {
      error: 'Order not found.',
    };
  }

  /*
   * Confirmation is only allowed while the order
   * is still in a pre-confirmation state.
   *
   * COD normally starts at "placed".
   * UPI may reach "payment_confirmed" after payment.
   */
  const confirmableStatuses =
    order.payment_method === 'cod'
      ? ['placed']
      : ['payment_pending', 'payment_confirmed', 'placed'];

  if (!confirmableStatuses.includes(order.order_status)) {
    return {
      error:
        'This order is no longer waiting for confirmation.',
    };
  }

  /*
   * UPI must have a verified payment before confirmation.
   */
  if (
    order.payment_method === 'upi_qr' &&
    order.payment_status !== 'paid'
  ) {
    return {
      error:
        'UPI payment must be verified before confirming this order.',
    };
  }

  /*
   * Conditional update prevents two order managers
   * from confirming the same order simultaneously.
   */
  const {
    data: updatedOrder,
    error: updateError,
  } = await supabase
    .from('orders')
    .update({
      order_status: 'confirmed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', cleanId)
    .eq('order_status', order.order_status)
    .select('id')
    .maybeSingle();

  if (updateError) {
    console.error(
      'CONFIRM ORDER ERROR:',
      updateError,
    );

    return {
      error: 'Order could not be confirmed.',
    };
  }

  if (!updatedOrder) {
    return {
      error:
        'Order could not be confirmed. It may have already been updated.',
    };
  }

  console.info(
    `Order ${order.order_number} confirmed by ${user.id}`,
  );

  revalidateOrderPaths(cleanId);

  return {
    success: true,
  };
}

/**
 * Reject / cancel an unconfirmed order.
 *
 * We deliberately do NOT hard-delete it.
 * Cancelled orders remain available for history/reporting.
 */
export async function rejectCustomerOrder(
  orderId: string,
) {
  const {
    supabase,
    user,
  } = await requireOrderManager();

  const cleanId = cleanOrderId(orderId);

  if (!cleanId) {
    return {
      error: 'Invalid order ID.',
    };
  }

  const {
    data: order,
    error: orderError,
  } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      order_status
    `)
    .eq('id', cleanId)
    .single();

  if (orderError || !order) {
    return {
      error: 'Order not found.',
    };
  }

  const cancellableStatuses = [
    'placed',
    'payment_pending',
    'payment_confirmed',
  ] as const;

  if (
    !cancellableStatuses.includes(
      order.order_status as (typeof cancellableStatuses)[number],
    )
  ) {
    return {
      error:
        'This order can no longer be cancelled from confirmation.',
    };
  }

  /*
   * Conditional update prevents two managers from
   * cancelling/changing the same order simultaneously.
   */
  const {
    data: updatedOrder,
    error: updateError,
  } = await supabase
    .from('orders')
    .update({
      order_status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', cleanId)
    .eq('order_status', order.order_status)
    .select('id')
    .maybeSingle();

  if (updateError) {
    console.error(
      'REJECT ORDER ERROR:',
      updateError,
    );

    return {
      error: 'Order could not be cancelled.',
    };
  }

  if (!updatedOrder) {
    return {
      error:
        'Order could not be cancelled. It may have already been updated.',
    };
  }

  console.info(
    `Order ${order.order_number} cancelled by ${user.id}`,
  );

  revalidateOrderPaths(cleanId);

  return {
    success: true,
  };
}

function revalidateOrderPaths(orderId: string) {
  revalidatePath('/admin/orders');
  revalidatePath('/admin/dashboard');
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath('/admin/packing');
  revalidatePath('/admin/delivery');
}