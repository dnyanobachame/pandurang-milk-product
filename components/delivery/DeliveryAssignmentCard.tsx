'use client';

import { useState, useTransition } from 'react';
import {
  acceptAssignment, startDelivery, reachCustomer, confirmDelivery, markDeliveryFailed,
} from '@/app/actions/delivery';

const FAILURE_REASONS = [
  'Customer unavailable', 'Wrong address', 'Customer cancelled', 'Product issue', 'Other',
];

export function DeliveryAssignmentCard({
  assignmentId, orderNumber, total, paymentMethod, address, status: initialStatus,
}: {
  assignmentId: string;
  orderNumber: string;
  total: number;
  paymentMethod: string;
  address: string;
  status: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [otp, setOtp] = useState('');
  const [cashCollected, setCashCollected] = useState(String(total));
  const [showFail, setShowFail] = useState(false);
  const [failReason, setFailReason] = useState(FAILURE_REASONS[0]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string; ok?: boolean }>, nextStatus?: string) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (nextStatus) setStatus(nextStatus);
    });
  }

  if (status === 'delivered') {
    return (
      <div className="rounded-xl2 border border-brand-100 bg-brand-50 p-4">
        <p className="font-medium">Order #{orderNumber}</p>
        <p className="text-sm text-brand-700 mt-1">Delivered ✓</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="rounded-xl2 border border-red-100 bg-red-50 p-4">
        <p className="font-medium">Order #{orderNumber}</p>
        <p className="text-sm text-red-600 mt-1">Delivery failed</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl2 border border-gray-100 bg-white p-4 shadow-sm">
      <p className="font-medium">Order #{orderNumber}</p>
      <p className="text-sm text-gray-500">{address}</p>
      <div className="flex justify-between items-center mt-2">
        <span className="font-semibold">₹{total}</span>
        <span className="text-xs uppercase text-gray-500">{paymentMethod}</span>
      </div>
      <p className="text-xs text-gray-400 mt-1 capitalize">{status.replace(/_/g, ' ')}</p>

      {status === 'assigned' && (
        <button
          onClick={() => run(() => acceptAssignment(assignmentId), 'accepted')}
          disabled={isPending}
          className="w-full mt-3 rounded-full bg-brand-600 text-white py-2 text-sm font-medium disabled:opacity-60"
        >
          Accept
        </button>
      )}

      {status === 'accepted' && (
        <button
          onClick={() => run(() => startDelivery(assignmentId), 'out_for_delivery')}
          disabled={isPending}
          className="w-full mt-3 rounded-full bg-brand-600 text-white py-2 text-sm font-medium disabled:opacity-60"
        >
          Start Delivery
        </button>
      )}

      {status === 'out_for_delivery' && (
        <button
          onClick={() => run(() => reachCustomer(assignmentId), 'reached_customer')}
          disabled={isPending}
          className="w-full mt-3 rounded-full bg-brand-600 text-white py-2 text-sm font-medium disabled:opacity-60"
        >
          Reached Customer
        </button>
      )}

      {status === 'reached_customer' && (
        <div className="mt-3 space-y-2">
          <label className="block text-xs text-gray-500">
            Customer OTP
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              inputMode="numeric"
              maxLength={4}
              placeholder="4-digit code"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm tracking-widest text-center font-mono"
            />
          </label>
          {paymentMethod === 'cod' && (
            <label className="block text-xs text-gray-500">
              Cash collected (₹)
              <input
                type="number" value={cashCollected}
                onChange={(e) => setCashCollected(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
          )}
          <button
            onClick={() =>
              run(
                () => confirmDelivery(assignmentId, otp, paymentMethod === 'cod' ? Number(cashCollected) : undefined),
                'delivered'
              )
            }
            disabled={isPending || otp.length < 4}
            className="w-full rounded-full bg-brand-600 text-white py-2 text-sm font-medium disabled:opacity-40"
          >
            Confirm Delivery
          </button>
        </div>
      )}

      {!showFail ? (
        <button
          onClick={() => setShowFail(true)}
          className="w-full mt-2 text-xs text-red-500"
        >
          Report a delivery problem
        </button>
      ) : (
        <div className="mt-2 space-y-2">
          <select
            value={failReason}
            onChange={(e) => setFailReason(e.target.value)}
            className="w-full text-xs rounded-lg border border-gray-200 px-2 py-1.5"
          >
            {FAILURE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button
            onClick={() => run(() => markDeliveryFailed(assignmentId, failReason), 'failed')}
            disabled={isPending}
            className="w-full text-xs rounded-full border border-red-300 text-red-600 py-1.5"
          >
            Confirm Delivery Failed
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
