'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateOtp, hashOtp } from '@/lib/otp';

const DELIVERY_MANAGER_ROLES = [
  'admin',
  'delivery_manager',
];

const ACTIVE_ASSIGNMENT_STATUSES = [
  'assigned',
  'accepted',
  'picked_up',
  'out_for_delivery',
  'reached_customer',
];

type DeliveryPartnerRelation =
  | {
      is_on_duty: boolean;
    }
  | {
      is_on_duty: boolean;
    }[]
  | null;

function cleanId(value: string) {
  return String(value ?? '').trim();
}

function isValidCashAmount(value: number) {
  return Number.isFinite(value) && value >= 0;
}

function refreshDeliveryPaths(orderId?: string) {
  revalidatePath('/delivery');
  revalidatePath('/admin/delivery');
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/orders');

  if (orderId) {
    revalidatePath(`/admin/orders/${orderId}`);
  }
}

async function requireRole(allowed: string[]) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: 'Please sign in again.' as const,
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (
    !profile ||
    profile.is_active !== true ||
    !allowed.includes(profile.role)
  ) {
    return {
      error: 'You are not authorized to do this.' as const,
    };
  }

  return {
    supabase,
    user,
    role: profile.role,
  };
}

async function requireOwnAssignment(assignmentId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: 'Please sign in again.' as const,
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (
    !profile ||
    profile.is_active !== true ||
    profile.role !== 'delivery_partner'
  ) {
    return {
      error:
        'You are not authorized to perform delivery actions.' as const,
    };
  }

  const cleanAssignmentId = cleanId(assignmentId);

  if (!cleanAssignmentId) {
    return {
      error: 'Invalid delivery assignment.' as const,
    };
  }

  const { data: assignment } = await supabase
    .from('delivery_assignments')
    .select(
      'id, order_id, delivery_partner_id, status',
    )
    .eq('id', cleanAssignmentId)
    .single();

  if (!assignment) {
    return {
      error: 'Delivery assignment not found.' as const,
    };
  }

  if (assignment.delivery_partner_id !== user.id) {
    return {
      error:
        'This delivery is not assigned to you.' as const,
    };
  }

  return {
    supabase,
    user,
    assignment,
  };
}

// ============================================================================
// ASSIGNMENT
// ============================================================================

export async function assignDeliveryPartner(
  orderId: string,
  partnerId: string,
) {
  const auth = await requireRole(
    DELIVERY_MANAGER_ROLES,
  );

  if ('error' in auth) return auth;

  const { supabase } = auth;

  const cleanOrderId = cleanId(orderId);
  const cleanPartnerId = cleanId(partnerId);

  if (!cleanOrderId || !cleanPartnerId) {
    return {
      error:
        'Order and delivery partner are required.',
    };
  }

  // --------------------------------------------------------------------------
  // Verify partner before calling the transaction RPC
  // --------------------------------------------------------------------------

  const { data: partner } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      role,
      is_active,
      delivery_partners(is_on_duty)
    `)
    .eq('id', cleanPartnerId)
    .eq('role', 'delivery_partner')
    .eq('is_active', true)
    .maybeSingle();

  if (!partner) {
    return {
      error:
        'This delivery partner is not active or does not exist.',
    };
  }

  const deliveryPartner = Array.isArray(
    partner.delivery_partners,
  )
    ? partner.delivery_partners[0]
    : partner.delivery_partners;

  // Critical: do not allow assignment to an off-duty partner.
  if (!deliveryPartner?.is_on_duty) {
    return {
      error:
        'This delivery partner is currently off duty.',
    };
  }

  // --------------------------------------------------------------------------
  // Read order for validation and notification details
  // --------------------------------------------------------------------------

  const { data: order } = await supabase
    .from('orders')
    .select(
      'id, order_number, order_status, delivery_partner_id',
    )
    .eq('id', cleanOrderId)
    .single();

  if (!order) {
    return {
      error: 'Order not found.',
    };
  }

  if (order.order_status !== 'packed') {
    return {
      error:
        'Only packed orders can be assigned for delivery.',
    };
  }

  if (order.delivery_partner_id) {
    return {
      error:
        'This order already has a delivery partner.',
    };
  }

  // --------------------------------------------------------------------------
  // Atomic assignment + order update
  // --------------------------------------------------------------------------

  const { data, error } = await supabase.rpc(
    'assign_delivery_transaction',
    {
      p_order_id: cleanOrderId,
      p_delivery_partner_id: cleanPartnerId,
    },
  );

  if (error) {
    console.error(
      'assign_delivery_transaction RPC failed:',
      error,
    );

    return {
      error:
        error.message ||
        'Could not assign this delivery. Please refresh and try again.',
    };
  }

  if (!data?.success || !data.assignment_id) {
    return {
      error:
        'The delivery could not be assigned. Please refresh and try again.',
    };
  }

  // --------------------------------------------------------------------------
  // Notify partner after the transaction succeeds
  // --------------------------------------------------------------------------

  const { error: notificationError } =
    await supabase
      .from('notifications')
      .insert({
        recipient_id: cleanPartnerId,
        title: 'New delivery assigned',
        body: `Order #${order.order_number} has been assigned to you.`,
        type: 'delivery',
        reference_id: cleanOrderId,
      });

  // Notification failure must not roll back
  // the already-committed assignment.
  if (notificationError) {
    console.error(
      'Delivery notification failed:',
      notificationError.message,
    );
  }

  refreshDeliveryPaths();

  return {
    ok: true,
    assignmentId: data.assignment_id,
  };
}

// ============================================================================
// ACCEPT ASSIGNMENT
// ============================================================================

export async function acceptAssignment(
  assignmentId: string,
) {
  const auth =
    await requireOwnAssignment(
      assignmentId,
    );

  if ('error' in auth) return auth;

  const {
    supabase,
    assignment,
  } = auth;

  if (assignment.status !== 'assigned') {
    return {
      error:
        'This delivery is no longer waiting for acceptance.',
    };
  }

  const { data, error } =
    await supabase.rpc(
      'accept_delivery',
      {
        p_assignment_id:
          assignment.id,
      },
    );

  if (error) {
    console.error(
      'accept_delivery RPC failed:',
      error,
    );

    return {
      error:
        error.message ||
        'Could not accept this delivery. Please refresh and try again.',
    };
  }

  if (!data?.success) {
    return {
      error:
        'Delivery could not be accepted. Please refresh and try again.',
    };
  }

  refreshDeliveryPaths(
    assignment.order_id,
  );

  return { ok: true };
}

// ============================================================================
// START DELIVERY
// ============================================================================

export async function startDelivery(
  assignmentId: string,
) {
  const auth =
    await requireOwnAssignment(
      assignmentId,
    );

  if ('error' in auth) return auth;

  const {
    supabase,
    assignment,
  } = auth;

  if (assignment.status !== 'accepted') {
    return {
      error:
        'Accept this delivery first.',
    };
  }

  const { data, error } =
    await supabase.rpc(
      'start_delivery',
      {
        p_assignment_id:
          assignment.id,
      },
    );

  if (error) {
    console.error(
      'start_delivery RPC failed:',
      error,
    );

    return {
      error:
        error.message ||
        'Could not start this delivery. Please refresh and try again.',
    };
  }

  if (!data?.success) {
    return {
      error:
        'Delivery could not be started. Please refresh and try again.',
    };
  }

  refreshDeliveryPaths(
    assignment.order_id,
  );

  return { ok: true };
}

// ============================================================================
// REACHED CUSTOMER
// ============================================================================

export async function reachCustomer(
  assignmentId: string,
) {
  const auth =
    await requireOwnAssignment(
      assignmentId,
    );

  if ('error' in auth) return auth;

  const {
    supabase,
    assignment,
  } = auth;

  if (
    assignment.status !==
    'out_for_delivery'
  ) {
    return {
      error:
        'Start the delivery first.',
    };
  }

  const { data: order } =
    await supabase
      .from('orders')
      .select(
        'customer_id, order_number',
      )
      .eq(
        'id',
        assignment.order_id,
      )
      .single();

  if (!order) {
    return {
      error: 'Order not found.',
    };
  }

  // --------------------------------------------------------------------------
  // Prevent unlimited active OTPs
  // --------------------------------------------------------------------------

  const { data: activeOtp } =
    await supabase
      .from('delivery_otp')
      .select(
        'id, expires_at, is_verified',
      )
      .eq(
        'order_id',
        assignment.order_id,
      )
      .eq('is_verified', false)
      .order('created_at', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (
    activeOtp &&
    new Date(activeOtp.expires_at) >
      new Date()
  ) {
    return {
      error:
        'A delivery code is already active. Ask the customer to use the existing code.',
    };
  }

  const otp = generateOtp();

  const expiresAt = new Date(
    Date.now() + 15 * 60 * 1000,
  ).toISOString();

  // --------------------------------------------------------------------------
  // Create OTP
  // --------------------------------------------------------------------------

  const {
    data: createdOtp,
    error: otpError,
  } = await supabase
    .from('delivery_otp')
    .insert({
      order_id:
        assignment.order_id,
      otp_hash: hashOtp(otp),
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (otpError || !createdOtp) {
    console.error(
      'Delivery OTP insert failed:',
      otpError,
    );

    return {
      error:
        'Could not generate a delivery code.',
    };
  }

  // --------------------------------------------------------------------------
  // Notify customer
  // --------------------------------------------------------------------------

  const {
    error: notificationError,
  } = await supabase
    .from('notifications')
    .insert({
      recipient_id:
        order.customer_id,
      title: 'Delivery arriving now',
      body: `Your delivery partner is here for order #${order.order_number}. Share this code to confirm: ${otp}`,
      type: 'delivery',
      reference_id:
        assignment.order_id,
    });

  if (notificationError) {
    console.error(
      'Delivery OTP notification failed:',
      notificationError.message,
    );

    /*
     * The customer did not receive the notification,
     * so remove the newly-created OTP rather than
     * leaving an unusable active code behind.
     */
    await supabase
      .from('delivery_otp')
      .delete()
      .eq('id', createdOtp.id);

    return {
      error:
        'The delivery code was generated, but the customer notification failed.',
    };
  }

  // --------------------------------------------------------------------------
  // Atomically transition assignment + order
  // --------------------------------------------------------------------------

  const { data, error } =
    await supabase.rpc(
      'reach_customer',
      {
        p_assignment_id:
          assignment.id,
      },
    );

  if (error) {
    console.error(
      'reach_customer RPC failed:',
      error,
    );

    /*
     * The transition failed, so remove the OTP
     * that was generated for this attempt.
     */
    await supabase
      .from('delivery_otp')
      .delete()
      .eq('id', createdOtp.id);

    return {
      error:
        error.message ||
        'Could not mark the customer as reached. Please refresh and try again.',
    };
  }

  if (!data?.success) {
    await supabase
      .from('delivery_otp')
      .delete()
      .eq('id', createdOtp.id);

    return {
      error:
        'Customer could not be marked as reached. Please refresh and try again.',
    };
  }

  refreshDeliveryPaths(
    assignment.order_id,
  );

  return { ok: true };
}

// ============================================================================
// CONFIRM DELIVERY
// ============================================================================

export async function confirmDelivery(
  assignmentId: string,
  enteredOtp: string,
  cashCollected?: number,
) {
  const auth =
    await requireOwnAssignment(
      assignmentId,
    );

  if ('error' in auth) return auth;

  const {
    supabase,
    assignment,
  } = auth;

  if (
    assignment.status !==
    'reached_customer'
  ) {
    return {
      error:
        'Mark "Reached Customer" before confirming delivery.',
    };
  }

  const normalizedOtp =
    String(enteredOtp ?? '').trim();

  if (
    !/^\d{4,8}$/.test(
      normalizedOtp,
    )
  ) {
    return {
      error:
        'Enter the delivery code shown to the customer.',
    };
  }

  if (
    cashCollected !== undefined &&
    !isValidCashAmount(
      cashCollected,
    )
  ) {
    return {
      error:
        'Cash collected must be zero or greater.',
    };
  }

  /*
   * The RPC performs atomically:
   *
   * - OTP verification
   * - delivery assignment -> delivered
   * - order -> delivered
   * - COD payment -> paid
   * - cash collection recording
   */
  const { data, error } =
    await supabase.rpc(
      'confirm_delivery_transaction',
      {
        p_assignment_id:
          assignment.id,
        p_otp: normalizedOtp,
        p_cash_collected:
          cashCollected === undefined
            ? null
            : cashCollected,
      },
    );

  if (error) {
    console.error(
      'confirm_delivery_transaction RPC failed:',
      error,
    );

    const message =
      error.message || '';

    if (
      message.includes(
        'Invalid delivery OTP',
      )
    ) {
      return {
        error:
          'Incorrect code. Please check with the customer and try again.',
      };
    }

    if (
      message.includes('expired')
    ) {
      return {
        error:
          'This code has expired. Generate a new delivery code.',
      };
    }

    if (
      message.includes(
        'already been used',
      )
    ) {
      return {
        error:
          'This delivery code has already been used. Refresh the delivery screen.',
      };
    }

    if (
      message.includes(
        'Cash collected',
      )
    ) {
      return {
        error: message,
      };
    }

    return {
      error:
        message ||
        'Delivery could not be completed. Please verify the OTP and try again.',
    };
  }

  if (!data?.success) {
    return {
      error:
        'Delivery could not be completed. Please refresh and try again.',
    };
  }

  refreshDeliveryPaths(
    assignment.order_id,
  );

  revalidatePath(
    '/dashboard/notifications',
  );

  return {
    ok: true,
  };
}

// ============================================================================
// FAILED DELIVERY
// ============================================================================

export async function markDeliveryFailed(
  assignmentId: string,
  reason: string,
) {
  const auth =
    await requireOwnAssignment(
      assignmentId,
    );

  if ('error' in auth) return auth;

  const {
    supabase,
    assignment,
  } = auth;

  const normalizedReason =
    String(reason ?? '').trim();

  if (
    normalizedReason.length < 3 ||
    normalizedReason.length > 500
  ) {
    return {
      error:
        'Please provide a delivery failure reason between 3 and 500 characters.',
    };
  }

  /*
   * The RPC performs atomically:
   *
   * - delivery partner authorization
   * - assignment status validation
   * - assignment -> failed
   * - order -> delivery_failed
   *
   * If either database update fails,
   * the entire transaction rolls back.
   */
  const { data, error } =
    await supabase.rpc(
      'mark_delivery_failed',
      {
        p_assignment_id:
          assignment.id,
        p_reason:
          normalizedReason,
      },
    );

  if (error) {
    console.error(
      'mark_delivery_failed RPC failed:',
      error,
    );

    const message =
      error.message || '';

    if (
      message.includes(
        'cannot be marked as failed',
      ) ||
      message.includes(
        'already changed',
      )
    ) {
      return {
        error: message,
      };
    }

    if (
      message.includes(
        'Authentication required',
      ) ||
      message.includes(
        'Only active delivery partners',
      )
    ) {
      return {
        error:
          'You are not authorized to mark this delivery as failed.',
      };
    }

    return {
      error:
        message ||
        'Could not mark this delivery as failed. Please refresh and try again.',
    };
  }

  if (!data?.success) {
    return {
      error:
        'The delivery could not be marked as failed. Please refresh and try again.',
    };
  }

  refreshDeliveryPaths(
    assignment.order_id,
  );

  return {
    ok: true,
  };
}