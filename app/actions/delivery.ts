'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateOtp, hashOtp, verifyOtp } from '@/lib/otp';

const DELIVERY_MANAGER_ROLES = ['admin', 'delivery_manager'];

async function requireRole(allowed: string[]) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' as const };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !allowed.includes(profile.role)) {
    return { error: 'You are not authorized to do this.' as const };
  }
  return { supabase, user, role: profile.role };
}

async function requireOwnAssignment(assignmentId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' as const };

  const { data: assignment } = await supabase
    .from('delivery_assignments')
    .select('id, order_id, delivery_partner_id, status')
    .eq('id', assignmentId)
    .single();

  if (!assignment) return { error: 'Delivery assignment not found.' };
  if (assignment.delivery_partner_id !== user.id) {
    return { error: 'This delivery is not assigned to you.' };
  }
  return { supabase, user, assignment };
}

// ============================================================================
// ASSIGNMENT (Delivery Manager / Admin)
// ============================================================================

export async function assignDeliveryPartner(orderId: string, partnerId: string) {
  const auth = await requireRole(DELIVERY_MANAGER_ROLES);
  if ('error' in auth) return auth;
  const { supabase } = auth;

  const { data: order } = await supabase
    .from('orders')
    .select('order_status, delivery_partner_id')
    .eq('id', orderId)
    .single();

  if (!order) return { error: 'Order not found.' };
  if (order.order_status !== 'packed') {
    return { error: 'Only packed orders can be assigned for delivery.' };
  }

  const { error: assignError } = await supabase.from('delivery_assignments').insert({
    order_id: orderId,
    delivery_partner_id: partnerId,
    status: 'assigned',
  });
  if (assignError) return { error: 'Could not create the delivery assignment.' };

  const { error: orderError } = await supabase
    .from('orders')
    .update({ delivery_partner_id: partnerId, order_status: 'assigned', delivery_status: 'assigned' })
    .eq('id', orderId);
  if (orderError) return { error: 'Assignment created, but the order could not be updated.' };

  await supabase.from('notifications').insert({
    recipient_id: partnerId,
    title: 'New delivery assigned',
    body: `You've been assigned a new delivery.`,
    type: 'delivery',
    reference_id: orderId,
  });

  revalidatePath('/admin/delivery');
  return { ok: true };
}

// ============================================================================
// PARTNER WORKFLOW: Assigned -> Accepted -> (picked up +) Out for Delivery
// -> Reached Customer -> Delivered. "Start Delivery" folds picked_up and
// out_for_delivery into a single tap, matching the mobile UI (§71) — both
// timestamps are still recorded on delivery_assignments.
// ============================================================================

export async function acceptAssignment(assignmentId: string) {
  const auth = await requireOwnAssignment(assignmentId);
  if ('error' in auth) return auth;
  const { supabase, assignment } = auth;
  if (assignment.status !== 'assigned') return { error: 'This delivery has already been actioned.' };

  const { error } = await supabase
    .from('delivery_assignments')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', assignmentId);
  if (error) return { error: 'Could not accept this delivery.' };

  await supabase.from('orders').update({ delivery_status: 'accepted' }).eq('id', assignment.order_id);

  revalidatePath('/delivery');
  return { ok: true };
}

export async function startDelivery(assignmentId: string) {
  const auth = await requireOwnAssignment(assignmentId);
  if ('error' in auth) return auth;
  const { supabase, assignment } = auth;
  if (assignment.status !== 'accepted') return { error: 'Accept this delivery first.' };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('delivery_assignments')
    .update({ status: 'out_for_delivery', picked_up_at: now, out_for_delivery_at: now })
    .eq('id', assignmentId);
  if (error) return { error: 'Could not start this delivery.' };

  await supabase.from('orders').update({ order_status: 'out_for_delivery', delivery_status: 'out_for_delivery' }).eq('id', assignment.order_id);

  revalidatePath('/delivery');
  return { ok: true };
}

/**
 * Partner taps "Reached Customer" — generates a fresh OTP and stores only
 * its hash in `delivery_otp` (never the plain value). The plain OTP is
 * given to the customer, once, via an in-app notification — the only
 * delivery channel available until WhatsApp/SMS is wired up in Phase 5 —
 * since the customer is the one who needs to read it out to the partner.
 */
export async function reachCustomer(assignmentId: string) {
  const auth = await requireOwnAssignment(assignmentId);
  if ('error' in auth) return auth;
  const { supabase, assignment } = auth;
  if (assignment.status !== 'out_for_delivery') return { error: 'Start the delivery first.' };

  const { data: order } = await supabase
    .from('orders')
    .select('customer_id, order_number')
    .eq('id', assignment.order_id)
    .single();
  if (!order) return { error: 'Order not found.' };

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { error: otpError } = await supabase.from('delivery_otp').insert({
    order_id: assignment.order_id,
    otp_hash: hashOtp(otp),
    expires_at: expiresAt,
  });
  if (otpError) return { error: 'Could not generate a delivery code.' };

  await supabase.from('notifications').insert({
    recipient_id: order.customer_id,
    title: 'Delivery arriving now',
    body: `Your delivery partner is here for order #${order.order_number}. Share this code to confirm: ${otp}`,
    type: 'delivery',
    reference_id: assignment.order_id,
  });

  const { error } = await supabase
    .from('delivery_assignments')
    .update({ status: 'reached_customer' })
    .eq('id', assignmentId);
  if (error) return { error: 'Could not update delivery status.' };

  await supabase.from('orders').update({ delivery_status: 'reached_customer' }).eq('id', assignment.order_id);

  revalidatePath('/delivery');
  return { ok: true };
}

/**
 * Partner enters the code the customer reads out. On match: order is
 * delivered, COD cash is recorded if applicable, and — critically — COD
 * orders are marked `paid` only now, at the moment cash actually changes
 * hands (UPI QR orders were already `paid` earlier via Admin verification).
 */
export async function confirmDelivery(assignmentId: string, enteredOtp: string, cashCollected?: number) {
  const auth = await requireOwnAssignment(assignmentId);
  if ('error' in auth) return auth;
  const { supabase, user, assignment } = auth;
  if (assignment.status !== 'reached_customer') {
    return { error: 'Mark "Reached Customer" before confirming delivery.' };
  }

  const { data: otpRow } = await supabase
    .from('delivery_otp')
    .select('id, otp_hash, is_verified, expires_at')
    .eq('order_id', assignment.order_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otpRow) return { error: 'No delivery code was generated for this order.' };
  if (otpRow.is_verified) return { error: 'This delivery has already been confirmed.' };
  if (new Date(otpRow.expires_at) < new Date()) {
    return { error: 'This code has expired. Tap "Reached Customer" again to generate a new one.' };
  }
  if (!verifyOtp(enteredOtp, otpRow.otp_hash)) {
    return { error: 'Incorrect code. Please check with the customer and try again.' };
  }

  const now = new Date().toISOString();

  await supabase.from('delivery_otp').update({ is_verified: true, verified_at: now }).eq('id', otpRow.id);

  const { error: assignError } = await supabase
    .from('delivery_assignments')
    .update({ status: 'delivered', delivered_at: now, cash_collected: cashCollected ?? null })
    .eq('id', assignmentId);
  if (assignError) return { error: 'Could not confirm this delivery.' };

  const { data: order } = await supabase
    .from('orders')
    .select('payment_method')
    .eq('id', assignment.order_id)
    .single();

  const orderUpdate: Record<string, unknown> = { order_status: 'delivered', delivery_status: 'delivered' };
  if (order?.payment_method === 'cod') {
    orderUpdate.payment_status = 'paid';
  }
  await supabase.from('orders').update(orderUpdate).eq('id', assignment.order_id);

  if (order?.payment_method === 'cod') {
    await supabase
      .from('payments')
      .update({ status: 'paid', paid_at: now, verified_by: user.id, verified_at: now })
      .eq('order_id', assignment.order_id);
  }

  revalidatePath('/delivery');
  revalidatePath('/admin/delivery');
  return { ok: true };
}

export async function markDeliveryFailed(assignmentId: string, reason: string) {
  const auth = await requireOwnAssignment(assignmentId);
  if ('error' in auth) return auth;
  const { supabase, assignment } = auth;

  const { error } = await supabase
    .from('delivery_assignments')
    .update({ status: 'failed', failed_reason: reason })
    .eq('id', assignmentId);
  if (error) return { error: 'Could not record this failure.' };

  await supabase.from('orders').update({ order_status: 'delivery_failed', delivery_status: 'failed' }).eq('id', assignment.order_id);

  revalidatePath('/delivery');
  revalidatePath('/admin/delivery');
  return { ok: true };
}
