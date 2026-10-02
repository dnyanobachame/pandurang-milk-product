'use client';

import { useState, useTransition } from 'react';
import {
  acceptAssignment,
  startDelivery,
  reachCustomer,
  confirmDelivery,
  markDeliveryFailed,
} from '@/app/actions/delivery';

const FAILURE_REASONS = [
  'Customer unavailable',
  'Wrong address',
  'Customer cancelled',
  'Product issue',
  'Other',
];

export function DeliveryAssignmentCard({
  assignmentId,
  orderNumber,
  total,
  paymentMethod,
  address,
  status: initialStatus,
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
  const [cashCollected, setCashCollected] = useState(
    Number(total).toFixed(2)
  );

  const [showFail, setShowFail] = useState(false);
  const [failReason, setFailReason] = useState(FAILURE_REASONS[0]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const normalizedPaymentMethod = paymentMethod.toLowerCase();
  const isCod = normalizedPaymentMethod === 'cod';

  const formattedTotal = Number(total).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  function run(
    action: () => Promise<{ error?: string; ok?: boolean }>,
    nextStatus?: string,
    successMessage?: string
  ) {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const result = await action();

        if (result?.error) {
          setError(result.error);
          return;
        }

        if (nextStatus) {
          setStatus(nextStatus);
        }

        if (successMessage) {
          setSuccess(successMessage);
        }
      } catch (err) {
        console.error('Delivery action failed:', err);
        setError('Something went wrong. Please try again.');
      }
    });
  }

  function confirmAction(message: string) {
    return window.confirm(message);
  }

  function handleAccept() {
    if (
      !confirmAction(
        `Accept delivery order #${orderNumber}?`
      )
    ) {
      return;
    }

    run(
      () => acceptAssignment(assignmentId),
      'accepted',
      'Delivery accepted.'
    );
  }

  function handleStartDelivery() {
    if (
      !confirmAction(
        `Start delivery for order #${orderNumber}?`
      )
    ) {
      return;
    }

    run(
      () => startDelivery(assignmentId),
      'out_for_delivery',
      'Delivery started.'
    );
  }

  function handleReachedCustomer() {
    if (
      !confirmAction(
        `Confirm that you have reached the customer for order #${orderNumber}?`
      )
    ) {
      return;
    }

    run(
      () => reachCustomer(assignmentId),
      'reached_customer',
      'Customer reached. Ask the customer for the OTP.'
    );
  }

  function handleConfirmDelivery() {
    const cleanOtp = otp.replace(/\D/g, '');

    if (cleanOtp.length < 4 || cleanOtp.length > 8) {
      setError('Enter the valid customer OTP.');
      return;
    }

    if (isCod) {
      const amount = Number(cashCollected);

      if (!Number.isFinite(amount) || amount < 0) {
        setError('Enter a valid cash amount.');
        return;
      }

      if (Math.abs(amount - Number(total)) > 0.01) {
        setError(
          `Collect the exact COD amount of ₹${formattedTotal}.`
        );
        return;
      }
    }

    const confirmationText = isCod
      ? `Confirm delivery for order #${orderNumber}?\n\nCash collected: ₹${formattedTotal}\n\nMake sure you have received the cash and verified the customer OTP.`
      : `Confirm delivery for order #${orderNumber}?\n\nMake sure the customer OTP is correct.`;

    if (!confirmAction(confirmationText)) {
      return;
    }

    run(
      () =>
        confirmDelivery(
          assignmentId,
          cleanOtp,
          isCod ? Number(cashCollected) : undefined
        ),
      'delivered',
      'Delivery completed successfully.'
    );
  }

  function handleFailDelivery() {
    if (!failReason) {
      setError('Please select a delivery problem.');
      return;
    }

    if (
      !confirmAction(
        `Mark order #${orderNumber} as failed?\n\nReason: ${failReason}`
      )
    ) {
      return;
    }

    run(
      () => markDeliveryFailed(assignmentId, failReason),
      'failed',
      'Delivery marked as failed.'
    );
  }

  if (status === 'delivered') {
    return (
      <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
        <div className="bg-emerald-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-xl text-emerald-700">
              ✓
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">
                Order #{orderNumber}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-emerald-700">
                Delivered successfully
              </p>
            </div>
            <span className="ml-auto rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
              Done
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-sm">
        <div className="bg-red-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-lg text-red-600">
              !
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">
                Order #{orderNumber}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-red-700">
                Delivery failed
              </p>
            </div>
            <span className="ml-auto rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700 ring-1 ring-red-200">
              Failed
            </span>
          </div>
        </div>
      </div>
    );
  }

  const stepStatus = {
    assigned: 1,
    accepted: 2,
    picked_up: 3,
    out_for_delivery: 4,
    reached_customer: 5,
  }[status] ?? 1;

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* Order identity */}
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg">
            📦
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  Delivery order
                </p>
                <h3 className="mt-0.5 truncate text-base font-bold text-slate-950">
                  #{orderNumber}
                </h3>
              </div>
              <StatusBadge status={status} />
            </div>

            <p className="mt-2 flex gap-1.5 text-xs leading-5 text-slate-500">
              <span className="shrink-0">📍</span>
              <span className="min-w-0">{address || 'Address not available'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Order value */}
      <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-100">
        <div className="px-5 py-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Amount
          </p>
          <p className="mt-1 text-lg font-bold tracking-tight text-slate-950">
            ₹{formattedTotal}
          </p>
        </div>

        <div className="px-5 py-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Payment
          </p>
          <div className="mt-1">
            {isCod ? (
              <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-100">
                Cash on delivery
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
                Online paid
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
            Delivery progress
          </p>
          <span className="text-[10px] font-semibold text-slate-400">
            Step {stepStatus} of 5
          </span>
        </div>

        <div className="mt-3 flex items-center">
          {['Assigned', 'Accepted', 'Picked up', 'On the way', 'Customer'].map(
            (label, index) => {
              const step = index + 1;
              const complete = step <= stepStatus;
              const current = step === stepStatus;

              return (
                <div
                  key={label}
                  className={`flex items-center ${
                    index < 4 ? 'min-w-0 flex-1' : ''
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition ${
                        complete
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-100 text-slate-400'
                      } ${current ? 'ring-4 ring-brand-50' : ''}`}
                    >
                      {complete ? '✓' : step}
                    </div>
                    <span
                      className={`mt-1.5 max-w-[58px] text-center text-[8px] font-semibold leading-3 ${
                        current ? 'text-brand-700' : 'text-slate-400'
                      }`}
                    >
                      {label}
                    </span>
                  </div>

                  {index < 4 && (
                    <div
                      className={`mx-1 h-0.5 flex-1 rounded-full ${
                        step < stepStatus ? 'bg-brand-500' : 'bg-slate-100'
                      }`}
                    />
                  )}
                </div>
              );
            },
          )}
        </div>
      </div>

      {/* Current action */}
      <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4">
        {status === 'assigned' && (
          <>
            <ActionMessage
              tone="blue"
              title="New delivery assigned"
              message="Accept this order to begin the delivery process."
            />
            <PrimaryButton
              onClick={handleAccept}
              disabled={isPending}
              loading={isPending}
              loadingText="Accepting…"
            >
              Accept Delivery
            </PrimaryButton>
          </>
        )}

        {status === 'accepted' && (
          <>
            <ActionMessage
              tone="indigo"
              title="Delivery accepted"
              message="Start delivery when you are ready to leave for the customer."
            />
            <PrimaryButton
              onClick={handleStartDelivery}
              disabled={isPending}
              loading={isPending}
              loadingText="Starting…"
            >
              Start Delivery
            </PrimaryButton>
          </>
        )}

        {status === 'out_for_delivery' && (
          <>
            <ActionMessage
              tone="orange"
              title="You are on the way"
              message="Only continue after you have reached the customer."
            />
            <PrimaryButton
              onClick={handleReachedCustomer}
              disabled={isPending}
              loading={isPending}
              loadingText="Updating…"
            >
              I Reached the Customer
            </PrimaryButton>
          </>
        )}

        {status === 'reached_customer' && (
          <div className="space-y-4">
            <ActionMessage
              tone="purple"
              title="Customer reached"
              message="Ask the customer for the delivery OTP before completing the order."
            />

            <label className="block">
              <span className="text-xs font-bold text-slate-700">
                Customer OTP
              </span>
              <div className="relative mt-1.5">
                <input
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value
                      .replace(/\D/g, '')
                      .slice(0, 8);

                    setOtp(value);
                    setError(null);
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  placeholder="0000"
                  aria-label="Customer delivery OTP"
                  className="min-h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-center font-mono text-2xl font-bold tracking-[0.45em] text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
                />
              </div>
              <span className="mt-1.5 block text-[10px] text-slate-400">
                Enter the code shown to the customer.
              </span>
            </label>

            {isCod ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-amber-950">
                      Cash collection required
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-amber-700">
                      Collect the exact order amount.
                    </p>
                  </div>
                  <span className="rounded-xl bg-white px-2.5 py-1.5 text-sm font-bold text-amber-900 ring-1 ring-amber-100">
                    ₹{formattedTotal}
                  </span>
                </div>

                <label className="mt-3 block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-amber-800">
                    Cash collected
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashCollected}
                    onChange={(e) => {
                      setCashCollected(e.target.value);
                      setError(null);
                    }}
                    className="mt-1.5 min-h-12 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-base font-semibold text-slate-950 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                  />
                </label>
              </div>
            ) : (
              <ActionMessage
                tone="green"
                title="Payment already received"
                message="No cash collection is required. Verify the OTP and complete delivery."
              />
            )}

            <PrimaryButton
              onClick={handleConfirmDelivery}
              disabled={
                isPending || otp.replace(/\D/g, '').length < 4
              }
              loading={isPending}
              loadingText="Confirming…"
              success
            >
              Confirm Delivery
            </PrimaryButton>
          </div>
        )}

        {/* Failure */}
        {!showFail ? (
          <button
            type="button"
            onClick={() => {
              setShowFail(true);
              setError(null);
              setSuccess(null);
            }}
            disabled={isPending}
            className="mt-3 min-h-10 w-full rounded-xl px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
          >
            Report a delivery problem
          </button>
        ) : (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-bold text-red-900">
              Why could you not deliver this order?
            </p>

            <select
              value={failReason}
              onChange={(e) => {
                setFailReason(e.target.value);
                setError(null);
              }}
              disabled={isPending}
              className="mt-2 min-h-11 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
            >
              {FAILURE_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowFail(false);
                  setError(null);
                }}
                disabled={isPending}
                className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleFailDelivery}
                disabled={isPending}
                className="min-h-11 flex-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? 'Updating…' : 'Confirm Failed'}
              </button>
            </div>
          </div>
        )}

        {/* Feedback */}
        {success && (
          <div
            role="status"
            className="mt-3 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5"
          >
            <span className="text-sm text-emerald-600">✓</span>
            <p className="text-xs font-semibold leading-5 text-emerald-700">
              {success}
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5"
          >
            <span className="text-sm text-red-600">!</span>
            <p className="text-xs font-semibold leading-5 text-red-700">
              {error}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  loading = false,
  loadingText,
  success = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  success?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`mt-3 min-h-12 w-full rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
        success
          ? 'bg-emerald-600 hover:bg-emerald-700'
          : 'bg-brand-600 hover:bg-brand-700'
      }`}
    >
      {loading ? loadingText ?? 'Updating…' : children}
    </button>
  );
}

function ActionMessage({
  tone,
  title,
  message,
}: {
  tone: 'blue' | 'indigo' | 'orange' | 'purple' | 'green';
  title: string;
  message: string;
}) {
  const styles = {
    blue: 'border-blue-100 bg-blue-50 text-blue-900',
    indigo: 'border-indigo-100 bg-indigo-50 text-indigo-900',
    orange: 'border-orange-100 bg-orange-50 text-orange-900',
    purple: 'border-purple-100 bg-purple-50 text-purple-900',
    green: 'border-emerald-100 bg-emerald-50 text-emerald-900',
  }[tone];

  return (
    <div className={`rounded-2xl border px-4 py-3 ${styles}`}>
      <p className="text-xs font-bold">{title}</p>
      <p className="mt-1 text-[10px] leading-4 opacity-80">{message}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { label: string; className: string }
  > = {
    assigned: {
      label: 'Assigned',
      className: 'bg-blue-100 text-blue-700',
    },
    accepted: {
      label: 'Accepted',
      className: 'bg-indigo-100 text-indigo-700',
    },
    picked_up: {
      label: 'Picked up',
      className: 'bg-purple-100 text-purple-700',
    },
    out_for_delivery: {
      label: 'On the way',
      className: 'bg-orange-100 text-orange-700',
    },
    reached_customer: {
      label: 'At customer',
      className: 'bg-purple-100 text-purple-700',
    },
  };

  const item = config[status] ?? {
    label: status.replace(/_/g, ' '),
    className: 'bg-gray-100 text-gray-600',
  };

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${item.className}`}
    >
      {item.label}
    </span>
  );
}