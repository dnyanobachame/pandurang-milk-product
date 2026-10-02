'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const ADMIN_ONLY_ROLES = ['admin'];

const ORDER_STATUS_VALUES = [
  'placed',
  'payment_pending',
  'payment_confirmed',
  'confirmed',
  'packing',
  'packed',
  'assigned',
  'out_for_delivery',
  'delivered',
  'delivery_failed',
  'cancelled',
  'rejected',
] as const;

const PAYMENT_STATUS_VALUES = [
  'pending',
  'payment_initiated',
  'payment_submitted',
  'paid',
  'failed',
  'refunded',
] as const;

const DELIVERY_STATUS_VALUES = [
  'unassigned',
  'assigned',
  'accepted',
  'picked_up',
  'out_for_delivery',
  'reached_customer',
  'delivered',
  'failed',
] as const;

type StageType = 'order' | 'payment' | 'delivery';

const STAGE_FIELDS = {
  order: 'order_status',
  payment: 'payment_status',
  delivery: 'delivery_status',
} as const;

function isAllowedValue(stage: StageType, value: string) {
  if (stage === 'order') {
    return (ORDER_STATUS_VALUES as readonly string[]).includes(value);
  }

  if (stage === 'payment') {
    return (PAYMENT_STATUS_VALUES as readonly string[]).includes(value);
  }

  return (DELIVERY_STATUS_VALUES as readonly string[]).includes(value);
}

async function requireAdminStageAccess() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: 'Unauthorized. Please sign in again.',
    } as const;
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
    !ADMIN_ONLY_ROLES.includes(String(profile.role))
  ) {
    return {
      error: 'Only an active administrator can change order stages.',
    } as const;
  }

  return {
    supabase,
    user,
  } as const;
}

export async function updateAdminOrderStage(
  orderId: string,
  stage: StageType,
  value: string,
) {
  const auth = await requireAdminStageAccess();

  if ('error' in auth) {
    return auth;
  }

  const cleanOrderId = String(orderId ?? '').trim();
  const cleanValue = String(value ?? '').trim();

  if (!cleanOrderId) {
    return { error: 'Invalid order ID.' };
  }

  if (!STAGE_FIELDS[stage]) {
    return { error: 'Invalid stage type.' };
  }

  if (!isAllowedValue(stage, cleanValue)) {
    return { error: `Invalid ${stage} status.` };
  }

  const { data: existingOrder, error: lookupError } = await auth.supabase
    .from('orders')
    .select('id, order_number, payment_method')
    .eq('id', cleanOrderId)
    .single();

  if (lookupError || !existingOrder) {
    return { error: 'Order not found.' };
  }

  const field = STAGE_FIELDS[stage];

  const { error: updateError } = await auth.supabase
    .from('orders')
    .update({
      [field]: cleanValue,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cleanOrderId);

  if (updateError) {
    console.error('ADMIN ORDER STAGE UPDATE ERROR:', updateError);

    return {
      error:
        updateError.message ||
        `Could not update the ${stage} status.`,
    };
  }

  /*
   * The payments table is the authoritative payment workflow record.
   * Keep its latest record synchronized when an administrator changes
   * payment status from the order detail page.
   */
  if (stage === 'payment') {
    const { data: payment } = await auth.supabase
      .from('payments')
      .select('id, status')
      .eq('order_id', cleanOrderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (payment?.id) {
      const paymentUpdate: Record<string, unknown> = {
        status: cleanValue,
      };

      if (cleanValue === 'paid') {
        paymentUpdate.paid_at = new Date().toISOString();
        paymentUpdate.verified_by = auth.user.id;
        paymentUpdate.verified_at = new Date().toISOString();
      }

      const { error: paymentError } = await auth.supabase
        .from('payments')
        .update(paymentUpdate)
        .eq('id', payment.id);

      if (paymentError) {
        console.error('ADMIN PAYMENT STAGE UPDATE ERROR:', paymentError);

        return {
          error:
            'Order payment status changed, but the payment record could not be synchronized.',
        };
      }
    }
  }

  revalidatePath('/admin/orders');
  revalidatePath('/admin/dashboard');
  revalidatePath(`/admin/orders/${cleanOrderId}`);
  revalidatePath('/admin/packing');
  revalidatePath('/admin/delivery');

  return {
    success: true,
    orderId: cleanOrderId,
    orderNumber: existingOrder.order_number,
    stage,
    value: cleanValue,
  };
}
