'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { packageProductionBatch } from '@/app/actions/production';

type PackageBatchFormProps = {
  productionBatchId: string;
  productId: string;
  unit: string;
  maxQuantity: number;
  suggestedExpiry: string;
};

export function PackageBatchForm({
  productionBatchId,
  productId,
  unit,
  maxQuantity,
  suggestedExpiry,
}: PackageBatchFormProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(String(maxQuantity));
  const [packageSize, setPackageSize] = useState('');
  const [expiry, setExpiry] = useState(suggestedExpiry);
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (submitting) return;

    const parsedQuantity = Number(quantity);
    const normalizedPackageSize = packageSize.trim() || unit;

    if (
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      setError('Enter a valid quantity greater than 0.');
      return;
    }

    if (parsedQuantity > maxQuantity) {
      setError(`Quantity cannot exceed ${maxQuantity}.`);
      return;
    }

    if (!expiry) {
      setError('Select an expiry date.');
      return;
    }

    if (!normalizedPackageSize) {
      setError('Enter a package size.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await packageProductionBatch({
        productionBatchId,
        productId,
        quantityPacked: parsedQuantity,
        packageSize: normalizedPackageSize,
        expiryDate: expiry,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError('Unable to package this batch. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
      >
        Package this batch
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-4 border-t border-gray-100 pt-4"
      noValidate
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block text-sm font-medium text-gray-700">
          Quantity to pack
          <input
            type="number"
            min={1}
            max={maxQuantity}
            step="any"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(error)}
            className="mt-1 min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-gray-50"
          />
          <span className="mt-1 block text-xs text-gray-500">
            Maximum: {maxQuantity}
          </span>
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Package size
          <input
            type="text"
            value={packageSize}
            placeholder={unit}
            onChange={(e) => setPackageSize(e.target.value)}
            disabled={submitting}
            className="mt-1 min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-gray-50"
          />
          <span className="mt-1 block text-xs text-gray-500">
            Default: {unit}
          </span>
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Expiry date
          <input
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            disabled={submitting}
            className="mt-1 min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-gray-50"
          />
        </label>
      </div>

      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-brand-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Packaging…' : 'Confirm packaging'}
        </button>

        <button
          type="button"
          onClick={handleClose}
          disabled={submitting}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}