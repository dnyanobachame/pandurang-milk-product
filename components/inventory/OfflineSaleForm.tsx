'use client';

import { useState, useTransition } from 'react';
import { recordOfflineSale } from '@/app/actions/offline-inventory-sale';

type Props = {
  productId: string;
  batchId: string | null;
  productName: string;
  unit: string | null;
  currentStock: number;
};

export function OfflineSaleForm({
  productId,
  batchId,
  productName,
  unit,
  currentStock,
}: Props) {
  const [quantity, setQuantity] = useState('1');
  const [reference, setReference] = useState('');
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const displayUnit = unit || 'units';

  function handleOpen() {
    setMessage(null);
    setConfirming(false);
    setOpen(true);
  }

  function handleCancel() {
    if (isPending) return;

    setOpen(false);
    setConfirming(false);
    setMessage(null);
  }

  function validateQuantity() {
    const parsed = Number(quantity);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      setMessage('Enter a quantity greater than zero.');
      return null;
    }

    if (parsed > currentStock) {
      setMessage(
        `Only ${currentStock} ${displayUnit} are currently available.`
      );
      return null;
    }

    return parsed;
  }

  function handleContinue() {
    if (isPending) return;

    setMessage(null);

    const parsed = validateQuantity();

    if (parsed === null) return;

    if (currentStock <= 0) {
      setMessage('No stock is currently available for an offline sale.');
      return;
    }

    setConfirming(true);
  }

  function handleConfirm() {
    if (isPending) return;

    const parsed = validateQuantity();

    if (parsed === null) return;

    const trimmedReference = reference.trim();

    startTransition(async () => {
      const result = await recordOfflineSale({
        productId,
        batchId,
        quantity: parsed,
        reference: trimmedReference,
      });

      if (result?.error) {
        setMessage(result.error);
        setConfirming(false);
        return;
      }

      setMessage(
        `Offline sale recorded: ${parsed} ${displayUnit}.`
      );
      setQuantity('1');
      setReference('');
      setConfirming(false);
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex min-h-[48px] w-full touch-manipulation items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      >
        Record Offline Sale
      </button>
    );
  }

  return (
    <section
      aria-label={`Record offline sale for ${productName}`}
      className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-950">
            Record Offline Sale
          </h3>
          <p className="mt-1 break-words text-xs leading-5 text-slate-500">
            {productName}
          </p>
        </div>

        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Close
        </button>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Available stock
        </p>
        <p className="mt-1 text-2xl font-bold text-slate-950">
          {currentStock.toLocaleString('en-IN')} {displayUnit}
        </p>
      </div>

      {currentStock <= 0 && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-medium text-amber-800"
        >
          No stock is currently available for an offline sale.
        </div>
      )}

      <label className="block text-sm font-semibold text-slate-700">
        Sold quantity
        <input
          type="number"
          min="0.01"
          step="0.01"
          max={currentStock}
          inputMode="decimal"
          value={quantity}
          onChange={(event) => {
            setQuantity(event.target.value);
            setMessage(null);
          }}
          disabled={isPending || confirming}
          className="mt-1 min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
        />
      </label>

      <label className="block text-sm font-semibold text-slate-700">
        Reference / note
        <input
          type="text"
          maxLength={500}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          disabled={isPending || confirming}
          placeholder="e.g. Counter sale / receipt #1042"
          className="mt-1 min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
        />
        <span className="mt-1 block text-xs text-slate-500">
          Optional · maximum 500 characters
        </span>
      </label>

      {message && !confirming && (
        <p
          role={message.startsWith('Offline sale recorded') ? 'status' : 'alert'}
          aria-live="polite"
          className={`rounded-xl px-3 py-3 text-sm font-medium ${
            message.startsWith('Offline sale recorded')
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message}
        </p>
      )}

      {!confirming ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleContinue}
            disabled={isPending || currentStock <= 0}
            className="inline-flex min-h-[50px] touch-manipulation items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="inline-flex min-h-[50px] touch-manipulation items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">
            Confirm offline sale
          </p>

          <p className="mt-1 text-sm leading-6 text-amber-800">
            Record a sale of{' '}
            <span className="font-bold">
              {Number(quantity)} {displayUnit}
            </span>{' '}
            for <span className="font-bold">{productName}</span>?
          </p>

          <p className="mt-2 text-xs leading-5 text-amber-700">
            This will reduce available stock and create a sale movement.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="inline-flex min-h-[50px] touch-manipulation items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Recording…' : 'Confirm Sale'}
            </button>

            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={isPending}
              className="inline-flex min-h-[50px] touch-manipulation items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Go Back
            </button>
          </div>
        </div>
      )}
    </section>
  );
}