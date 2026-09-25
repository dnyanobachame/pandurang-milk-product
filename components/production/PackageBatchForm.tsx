'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { packageProductionBatch } from '@/app/actions/production';

export function PackageBatchForm({
  productionBatchId, productId, unit, maxQuantity, suggestedExpiry,
}: {
  productionBatchId: string;
  productId: string;
  unit: string;
  maxQuantity: number;
  suggestedExpiry: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(String(maxQuantity));
  const [packageSize, setPackageSize] = useState('');
  const [expiry, setExpiry] = useState(suggestedExpiry);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await packageProductionBatch({
      productionBatchId,
      productId,
      quantityPacked: Number(quantity),
      packageSize: packageSize || unit,
      expiryDate: expiry,
    });
    setSubmitting(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 text-sm rounded-full bg-brand-600 text-white px-4 py-1.5"
      >
        Package this batch
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 border-t border-gray-100 pt-3 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs text-gray-500">
          Quantity to pack
          <input
            type="number" min={1} max={maxQuantity} value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Package size
          <input
            value={packageSize} placeholder={unit}
            onChange={(e) => setPackageSize(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Expiry date
          <input
            type="date" value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1 text-sm"
          />
        </label>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="text-sm rounded-full bg-brand-600 text-white px-4 py-1.5 disabled:opacity-60">
          {submitting ? 'Packaging…' : 'Confirm'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm rounded-full border border-gray-200 px-4 py-1.5">
          Cancel
        </button>
      </div>
    </form>
  );
}
