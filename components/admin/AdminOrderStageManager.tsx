'use client';

import { useState, useTransition } from 'react';
import { updateAdminOrderStage } from '@/app/actions/admin-order-stage';

type StageType = 'order' | 'payment' | 'delivery';

type Props = {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  deliveryStatus: string;
};

const ORDER_OPTIONS = [
  ['placed', 'Pending Confirmation'],
  ['payment_pending', 'Payment Pending'],
  ['payment_confirmed', 'Payment Confirmed'],
  ['confirmed', 'Confirmed'],
  ['packing', 'Packing'],
  ['packed', 'Packed'],
  ['assigned', 'Assigned'],
  ['out_for_delivery', 'Out for Delivery'],
  ['delivered', 'Delivered'],
  ['delivery_failed', 'Delivery Failed'],
  ['cancelled', 'Cancelled'],
  ['rejected', 'Rejected'],
] as const;

const PAYMENT_OPTIONS = [
  ['pending', 'Pending'],
  ['payment_initiated', 'Payment Initiated'],
  ['payment_submitted', 'Payment Review'],
  ['paid', 'Paid'],
  ['failed', 'Failed'],
  ['refunded', 'Refunded'],
] as const;

const DELIVERY_OPTIONS = [
  ['unassigned', 'Unassigned'],
  ['assigned', 'Assigned'],
  ['accepted', 'Accepted'],
  ['picked_up', 'Picked Up'],
  ['out_for_delivery', 'Out for Delivery'],
  ['reached_customer', 'Reached Customer'],
  ['delivered', 'Delivered'],
  ['failed', 'Failed'],
] as const;

function label(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AdminOrderStageManager({
  orderId,
  orderStatus,
  paymentStatus,
  deliveryStatus,
}: Props) {
  const [orderValue, setOrderValue] = useState(orderStatus);
  const [paymentValue, setPaymentValue] = useState(paymentStatus);
  const [deliveryValue, setDeliveryValue] = useState(deliveryStatus);
  const [activeStage, setActiveStage] = useState<StageType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveStage(stage: StageType, value: string) {
    setError(null);
    setSuccess(null);

    if (!value) {
      setError('Select a status first.');
      return;
    }

    const current =
      stage === 'order'
        ? orderValue
        : stage === 'payment'
          ? paymentValue
          : deliveryValue;

    if (current === value) {
      setSuccess('This stage is already set to the selected value.');
      return;
    }

    const confirmed = window.confirm(
      `Change ${stage} status from “${label(current)}” to “${label(value)}”?\n\nThis is an administrator override and can bypass the normal operational sequence.`,
    );

    if (!confirmed) return;

    setActiveStage(stage);

    startTransition(async () => {
      const result = await updateAdminOrderStage(orderId, stage, value);

      if (result.error) {
        setError(result.error);
        setActiveStage(null);
        return;
      }

      if (stage === 'order') {
        setOrderValue(value);
      } else if (stage === 'payment') {
        setPaymentValue(value);
      } else {
        setDeliveryValue(value);
      }

      setSuccess(`${label(stage)} status updated to ${label(value)}.`);
      setActiveStage(null);
      window.location.reload();
    });
  }

  return (
    <section
      className="rounded-2xl border border-red-200 bg-white shadow-sm"
      aria-labelledby="admin-stage-control-title"
    >
      <div className="border-b border-red-100 bg-red-50/60 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2
              id="admin-stage-control-title"
              className="text-base font-bold text-slate-900"
            >
              Administrator Stage Control
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Change the order, payment, or delivery stage directly from this
              order. Use this only for corrections or controlled admin
              overrides.
            </p>
          </div>

          <span className="inline-flex min-h-[28px] w-fit shrink-0 items-center rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-bold text-red-700">
            Admin only
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-3">
        <StageCard
          title="Order Stage"
          description="Main order workflow"
          value={orderValue}
          options={ORDER_OPTIONS}
          stage="order"
          activeStage={activeStage}
          isPending={isPending}
          onSave={saveStage}
        />

        <StageCard
          title="Payment Stage"
          description="Payment workflow"
          value={paymentValue}
          options={PAYMENT_OPTIONS}
          stage="payment"
          activeStage={activeStage}
          isPending={isPending}
          onSave={saveStage}
        />

        <StageCard
          title="Delivery Stage"
          description="Delivery workflow"
          value={deliveryValue}
          options={DELIVERY_OPTIONS}
          stage="delivery"
          activeStage={activeStage}
          isPending={isPending}
          onSave={saveStage}
        />
      </div>

      {error ? (
        <div
          className="mx-4 mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium leading-6 text-red-700 sm:mx-5"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          className="mx-4 mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium leading-6 text-emerald-700"
          role="status"
          aria-live="polite"
        >
          {success}
        </div>
      ) : null}

      <div className="border-t border-slate-100 px-4 py-4 text-xs leading-5 text-slate-500 sm:px-5">
        <strong className="text-slate-700">Important:</strong> manual stage
        changes do not replace the normal packing, payment-verification, or
        delivery workflows. Changing a stage directly can create a state that
        would normally only be reached after operational checks.
      </div>
    </section>
  );
}

type StageCardProps = {
  title: string;
  description: string;
  value: string;
  options: readonly (readonly [string, string])[];
  stage: StageType;
  activeStage: StageType | null;
  isPending: boolean;
  onSave: (stage: StageType, value: string) => void;
};

function StageCard({
  title,
  description,
  value,
  options,
  stage,
  activeStage,
  isPending,
  onSave,
}: StageCardProps) {
  const [selected, setSelected] = useState(value);
  const changed = selected !== value;
  const updating = isPending && activeStage === stage;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>

        <span className="max-w-[45%] shrink-0 truncate rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          {label(value)}
        </span>
      </div>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Change to
        </span>

        <select
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          disabled={isPending}
          aria-label={`${title} new status`}
          className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {options.map(([optionValue, optionLabel]) => (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={() => onSave(stage, selected)}
        disabled={!changed || isPending}
        aria-busy={updating}
        className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-100 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {updating ? (
          <>
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
            Updating…
          </>
        ) : (
          `Update ${title}`
        )}
      </button>
    </div>
  );
}