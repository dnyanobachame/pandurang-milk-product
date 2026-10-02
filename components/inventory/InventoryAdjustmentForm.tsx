'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adjustInventory } from '@/app/actions/inventory';

type Direction = 'increase' | 'decrease';
type ReasonCategory = 'found' | 'correction' | 'damaged' | 'expired';

type InventoryAdjustmentFormProps = {
  productId: string;
  batchId: string | null;
  productName: string;
};

export function InventoryAdjustmentForm({
  productId,
  batchId,
  productName,
}: InventoryAdjustmentFormProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<Direction>('decrease');
  const [reasonCategory, setReasonCategory] =
    useState<ReasonCategory>('damaged');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpen() {
    setError(null);
    setOpen(true);
  }

  function handleClose() {
    if (submitting) return;

    setError(null);
    setOpen(false);
  }

  function handleDirectionChange(nextDirection: Direction) {
    setDirection(nextDirection);

    setReasonCategory(
      nextDirection === 'decrease' ? 'damaged' : 'found'
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (submitting) return;

    const parsedQuantity = Number(quantity);
    const trimmedReason = reason.trim();

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError('Enter a valid quantity greater than 0.');
      return;
    }

    if (!trimmedReason) {
      setError('Enter a reason for this inventory adjustment.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await adjustInventory({
        productId,
        batchId,
        quantity: parsedQuantity,
        direction,
        reasonCategory,
        reason: trimmedReason,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
      setQuantity('');
      setReason('');
      setError(null);
      router.refresh();
    } catch {
      setError(
        'Unable to save the inventory adjustment. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputClassName =
    'min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50';

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex min-h-[44px] touch-manipulation items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        aria-label={`Adjust inventory for ${productName}`}
      >
        Adjust
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-4 rounded-2xl border border-slate-200 bg-cream-50 p-4 shadow-sm sm:p-5"
      noValidate
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-950">
            Inventory adjustment
          </h3>
          <p className="mt-1 break-words text-xs leading-5 text-slate-500">
            Adjusting <span className="font-semibold">{productName}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={handleClose}
          disabled={submitting}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Close inventory adjustment form"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Adjustment
          <select
            value={direction}
            onChange={(e) =>
              handleDirectionChange(e.target.value as Direction)
            }
            disabled={submitting}
            className={`${inputClassName} mt-1`}
          >
            <option value="decrease">Decrease stock</option>
            <option value="increase">Increase stock</option>
          </select>
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Reason category
          <select
            value={reasonCategory}
            onChange={(e) =>
              setReasonCategory(e.target.value as ReasonCategory)
            }
            disabled={submitting}
            className={`${inputClassName} mt-1`}
          >
            {direction === 'decrease' ? (
              <>
                <option value="damaged">Damaged</option>
                <option value="expired">Expired</option>
              </>
            ) : (
              <>
                <option value="found">Found stock</option>
                <option value="correction">Correction</option>
              </>
            )}
          </select>
        </label>
      </div>

      <label className="block text-sm font-semibold text-slate-700">
        Quantity
        <input
          type="number"
          min={1}
          step="any"
          inputMode="decimal"
          required
          placeholder="Enter quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          disabled={submitting}
          className={`${inputClassName} mt-1`}
        />
      </label>

      <label className="block text-sm font-semibold text-slate-700">
        Reason
        <textarea
          required
          rows={3}
          placeholder="Explain why the stock is being adjusted"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={submitting}
          className="mt-1 min-h-[96px] w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50"
        />
      </label>

      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-[50px] touch-manipulation items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save adjustment'}
        </button>

        <button
          type="button"
          onClick={handleClose}
          disabled={submitting}
          className="inline-flex min-h-[50px] touch-manipulation items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}