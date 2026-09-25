'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adjustInventory } from '@/app/actions/inventory';

export function InventoryAdjustmentForm({
  productId, batchId, productName,
}: {
  productId: string;
  batchId: string | null;
  productName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<'increase' | 'decrease'>('decrease');
  const [reasonCategory, setReasonCategory] = useState<'found' | 'correction' | 'damaged' | 'expired'>('damaged');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await adjustInventory({
      productId, batchId, quantity: Number(quantity), direction, reasonCategory, reason,
    });
    setSubmitting(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setQuantity('');
    setReason('');
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-brand-700 font-medium">
        Adjust
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 p-3 rounded-lg bg-cream-50 border border-gray-100 space-y-2 text-sm">
      <p className="text-xs text-gray-500">Adjusting {productName}</p>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as 'increase' | 'decrease')}
          className="rounded-lg border border-gray-200 px-2 py-1"
        >
          <option value="decrease">Decrease</option>
          <option value="increase">Increase</option>
        </select>
        <select
          value={reasonCategory}
          onChange={(e) => setReasonCategory(e.target.value as any)}
          className="rounded-lg border border-gray-200 px-2 py-1"
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
      </div>
      <input
        type="number" min={1} required placeholder="Quantity"
        value={quantity} onChange={(e) => setQuantity(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-2 py-1"
      />
      <input
        required placeholder="Reason (required)"
        value={reason} onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-2 py-1"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="rounded-full bg-brand-600 text-white px-3 py-1 disabled:opacity-60">
          {submitting ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-gray-200 px-3 py-1">
          Cancel
        </button>
      </div>
    </form>
  );
}
