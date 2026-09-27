'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const PAYMENT_STAFF_ROLES = [
  'admin',
  'accountant',
  'sales_manager',
];

/**
 * Customer submits a completed UPI payment.
 *
 * Important:
 * - Customer must own the order.
 * - Only UPI QR payments can use this action.
 * - This NEVER marks the order as paid.
 * - Customer must provide the UPI transaction ID.
 * - Payment moves:
 *   pending/payment_initiated -> payment_submitted
 */
export async function submitPaymentClaim(
  orderId: string,
  transactionId: string
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: 'Please sign in again.',
    };
  }

  if (!orderId) {
    return {
      error: 'Invalid order.',
    };
  }

  // Validate transaction ID on the server.
  const cleanTransactionId = transactionId?.trim();

  if (!cleanTransactionId) {
    return {
      error: 'Please enter your UPI transaction ID.',
    };
  }

  if (cleanTransactionId.length < 6) {
    return {
      error: 'UPI transaction ID looks too short.',
    };
  }

  if (cleanTransactionId.length > 100) {
    return {
      error: 'UPI transaction ID is too long.',
    };
  }

  // Allow common UPI transaction/reference formats.
  if (!/^[A-Za-z0-9._-]+$/.test(cleanTransactionId)) {
    return {
      error: 'UPI transaction ID contains invalid characters.',
    };
  }

  // Fetch the payment belonging to this customer.
  const {
    data: payment,
    error: paymentLookupError,
  } = await supabase
    .from('payments')
    .select(
      'id, order_id, customer_id, payment_method, status, transaction_id'
    )
    .eq('order_id', orderId)
    .eq('customer_id', user.id)
    .single();

  if (paymentLookupError || !payment) {
    return {
      error: 'Payment record not found for this order.',
    };
  }

  // COD orders must never use the UPI payment-claim action.
  if (payment.payment_method !== 'upi_qr') {
    return {
      error: 'This order does not use UPI payment.',
    };
  }

  // Already paid.
  if (payment.status === 'paid') {
    return {
      error: 'This payment has already been verified.',
    };
  }

  // Failed/refunded payments cannot be claimed.
  if (
    payment.status === 'failed' ||
    payment.status === 'refunded' ||
    payment.status === 'partially_refunded'
  ) {
    return {
      error: 'This payment cannot be submitted.',
    };
  }

  // Already submitted.
  if (payment.status === 'payment_submitted') {
    return {
      error: 'This payment is already awaiting verification.',
    };
  }

  // Only pending/payment_initiated can become payment_submitted.
  if (
    payment.status !== 'pending' &&
    payment.status !== 'payment_initiated'
  ) {
    return {
      error: 'This payment cannot be submitted in its current state.',
    };
  }

  /*
   * Prevent the same UPI transaction ID from being submitted
   * against another payment.
   */
  const {
    data: existingTransaction,
    error: transactionLookupError,
  } = await supabase
    .from('payments')
    .select('id')
    .eq('transaction_id', cleanTransactionId)
    .neq('id', payment.id)
    .maybeSingle();

  if (transactionLookupError) {
    return {
      error: 'Could not validate the transaction ID. Please try again.',
    };
  }

  if (existingTransaction) {
    return {
      error: 'This UPI transaction ID has already been submitted.',
    };
  }

  /*
   * Save the transaction ID and move payment to
   * payment_submitted.
   *
   * The status filter prevents a duplicate submission
   * from changing an already-submitted payment.
   */
  const {
    data: updatedPayment,
    error: updateError,
  } = await supabase
    .from('payments')
    .update({
      status: 'payment_submitted',
      transaction_id: cleanTransactionId,
    })
    .eq('id', payment.id)
    .eq('customer_id', user.id)
    .in('status', ['pending', 'payment_initiated'])
    .select('id')
    .maybeSingle();

  if (updateError) {
    console.error('[PAYMENT CLAIM] UPDATE ERROR', {
      paymentId: payment.id,
      error: updateError.message,
      details: updateError.details,
      hint: updateError.hint,
      code: updateError.code,
    });

    return {
      error: 'Could not record your payment. Please try again.',
    };
  }

  if (!updatedPayment) {
    return {
      error: 'This payment was already submitted. Please refresh the page.',
    };
  }

  revalidatePath(`/checkout/payment/${orderId}`);
  revalidatePath('/dashboard/orders');

  return {
    ok: true,
  };
}
/**
 * Admin/staff-only:
 * Verify a submitted UPI QR payment.
 *
 * This action:
 * 1. Requires an authorized staff role.
 * 2. Requires a UPI payment.
 * 3. Requires payment_submitted status.
 * 4. Marks the payment as paid.
 * 5. Confirms the order.
 */
export async function adminVerifyPayment(orderId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: 'Not signed in.',
    };
  }

  if (!orderId) {
    return {
      error: 'Invalid order.',
    };
  }

  // Server-side role check.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (
    profileError ||
    !profile ||
    !PAYMENT_STAFF_ROLES.includes(profile.role)
  ) {
    return {
      error: 'You are not authorized to verify payments.',
    };
  }

  // Fetch the payment before modifying anything.
  const {
    data: payment,
    error: paymentLookupError,
  } = await supabase
    .from('payments')
    .select(
      'id, order_id, customer_id, payment_method, status, amount, transaction_id'
    )
    .eq('order_id', orderId)
    .single();

  if (paymentLookupError || !payment) {
    return {
      error: 'Payment record not found.',
    };
  }

  // Admin verification is only for UPI QR payments.
  if (payment.payment_method !== 'upi_qr') {
    return {
      error: 'Only UPI payments can be manually verified.',
    };
  }

  // Prevent approving a payment that the customer never submitted.
  if (payment.status !== 'payment_submitted') {
    if (payment.status === 'paid') {
      return {
        error: 'This payment has already been verified.',
      };
    }

    return {
      error: 'This payment has not been submitted for verification.',
    };
  }

  // A transaction ID must exist before manual verification.
  if (!payment.transaction_id) {
    return {
      error:
        'Transaction ID is missing. The customer must submit the UPI transaction ID first.',
    };
  }

  const now = new Date().toISOString();

  /*
   * First update the payment.
   *
   * The status filter prevents two simultaneous verification
   * requests from both treating the same payment as pending.
   */
  const {
    data: updatedPayment,
    error: paymentError,
  } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      verified_by: user.id,
      verified_at: now,
      paid_at: now,
    })
    .eq('id', payment.id)
    .eq('status', 'payment_submitted')
    .select('id')
    .maybeSingle();

  if (paymentError) {
    return {
      error: 'Could not verify this payment.',
    };
  }

  if (!updatedPayment) {
    return {
      error: 'This payment was already processed.',
    };
  }

  /*
   * Then confirm the order.
   */
  const { error: orderError } = await supabase
    .from('orders')
    .update({
      payment_status: 'paid',
      order_status: 'confirmed',
    })
    .eq('id', orderId)
    .eq('payment_status', 'pending');

  if (orderError) {
    return {
      error:
        'Payment was verified, but the order could not be confirmed. Please check the order before retrying.',
    };
  }

  revalidatePath('/admin/orders');
  revalidatePath('/dashboard/orders');
  revalidatePath(`/checkout/payment/${orderId}`);

  return {
    ok: true,
  };
}

/**
 * Admin/staff-only:
 * Send a payment reminder for an unpaid order.
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

  if (!orderId) {
    return {
      error: 'Invalid order.',
    };
  }

  // Server-side staff role check.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (
    !profile ||
    !PAYMENT_STAFF_ROLES.includes(profile.role)
  ) {
    return {
      error: 'You are not authorized to send payment reminders.',
    };
  }

  // Find the order.
  const {
    data: order,
    error: orderError,
  } = await supabase
    .from('orders')
    .select(
      'id, customer_id, payment_status, payment_method'
    )
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
