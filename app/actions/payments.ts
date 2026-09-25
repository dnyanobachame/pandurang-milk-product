'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Customer clicks "I've Completed Payment".
 * This NEVER marks the order as paid.
 * It only records that the customer claims to have paid.
 */
export async function submitPaymentClaim(orderId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Please sign in again.' };
  }

  const { error } = await supabase
    .from('payments')
    .update({ status: 'payment_submitted' })
    .eq('order_id', orderId)
    .eq('customer_id', user.id);

  if (error) {
    return {
      error: 'Could not record your payment. Please try again.',
    };
  }

  revalidatePath(`/checkout/payment/${orderId}`);

  return { ok: true };
}

/**
 * Admin-only: verify a UPI QR payment and move the order
 * into the confirmed/packing pipeline.
 */
export async function adminVerifyPayment(orderId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not signed in.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (
    !profile ||
    !['admin', 'accountant', 'sales_manager'].includes(profile.role)
  ) {
    return {
      error: 'You are not authorized to verify payments.',
    };
  }

  const now = new Date().toISOString();

  const { error: paymentError } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      verified_by: user.id,
      verified_at: now,
      paid_at: now,
    })
    .eq('order_id', orderId);

  if (paymentError) {
    return {
      error: 'Could not verify this payment.',
    };
  }

  const { error: orderError } = await supabase
    .from('orders')
    .update({
      payment_status: 'paid',
      order_status: 'confirmed',
    })
    .eq('id', orderId);

  if (orderError) {
    return {
      error: 'Payment verified, but the order could not be updated.',
    };
  }

  revalidatePath('/admin/orders');

  return { ok: true };
}

/**
 * Admin/staff-only: send a payment reminder for an unpaid order.
 */
export async function sendPaymentReminder(orderId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: 'Not signed in.',
    };
  }

  // Check staff role server-side.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (
    !profile ||
    !['admin', 'accountant', 'sales_manager'].includes(profile.role)
  ) {
    return {
      error: 'You are not authorized to send payment reminders.',
    };
  }

  // Find the order.
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, customer_id, payment_status')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return {
      error: 'Order not found.',
    };
  }

  // Don't send reminders for paid orders.
  if (order.payment_status === 'paid') {
    return {
      error: 'This order has already been paid.',
    };
  }

  /*
   * TODO:
   * Connect this action to the project's WhatsApp/SMS/email
   * notification service.
   */

  revalidatePath('/admin/orders');

  return {
    ok: true,
  };
}