'use client';

import { useState } from 'react';
import {
  confirmCustomerOrder,
  rejectCustomerOrder,
} from '@/app/actions/admin-orders';

type Props = {
  orderId: string;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus: string;
};

export default function OrderActions({
  orderId,
  orderStatus,
  paymentMethod,
  paymentStatus,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canConfirmCOD =
    paymentMethod === 'cod' &&
    orderStatus === 'placed';

  const canConfirmUPI =
    paymentMethod === 'upi_qr' &&
    paymentStatus === 'paid' &&
    (
      orderStatus === 'payment_confirmed' ||
      orderStatus === 'payment_pending'
    );

  const canConfirm =
    canConfirmCOD || canConfirmUPI;

  const canReject =
    orderStatus === 'placed' ||
    orderStatus === 'payment_pending' ||
    orderStatus === 'payment_confirmed';

  async function handleConfirm() {
    const confirmed = window.confirm(
      'Have you contacted the customer and confirmed that they want this order?',
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage(null);

    const result = await confirmCustomerOrder(orderId);

    if (result.error) {
      setMessage(result.error);
    } else {
      setMessage('Order confirmed successfully.');
    }

    setLoading(false);
  }

  async function handleReject() {
    const confirmed = window.confirm(
      'Reject/cancel this customer order? The order will remain in history as cancelled.',
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage(null);

    const result = await rejectCustomerOrder(orderId);

    if (result.error) {
      setMessage(result.error);
    } else {
      setMessage('Order cancelled successfully.');
    }

    setLoading(false);
  }

  if (!canConfirm && !canReject) {
    return null;
  }

  return (
    <div
      className="space-y-3"
      aria-label="Order actions"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {canConfirm && (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            aria-busy={loading}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
                Processing...
              </>
            ) : (
              <>
                <span aria-hidden="true">✓</span>
                Confirm Order
              </>
            )}
          </button>
        )}

        {canReject && (
          <button
            type="button"
            onClick={handleReject}
            disabled={loading}
            aria-busy={loading}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              'Processing...'
            ) : (
              <>
                <span aria-hidden="true">✕</span>
                Reject / Cancel
              </>
            )}
          </button>
        )}
      </div>

      {message && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-lg bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-600"
        >
          {message}
        </p>
      )}
    </div>
  );
}