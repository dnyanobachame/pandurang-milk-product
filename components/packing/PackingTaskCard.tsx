'use client';

import { useState, useTransition } from 'react';
import { toggleChecklistItem, markTaskPacked } from '@/app/actions/packing';

const CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: 'correct_customer', label: 'Correct customer' },
  { key: 'correct_product', label: 'Correct product' },
  { key: 'correct_quantity', label: 'Correct quantity' },
  { key: 'correct_batch', label: 'Correct batch' },
  { key: 'expiry_checked', label: 'Expiry checked' },
  { key: 'packaging_intact', label: 'Packaging intact' },
  { key: 'invoice_included', label: 'Invoice included' },
  { key: 'delivery_label_attached', label: 'Delivery label attached' },
];

export function PackingTaskCard({
  taskId, orderNumber, status: initialStatus, checklist: initialChecklist,
}: {
  taskId: string;
  orderNumber: string;
  status: string;
  checklist: Record<string, boolean>;
}) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>(initialChecklist ?? {});
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const allChecked = CHECKLIST_ITEMS.every((item) => checklist[item.key] === true);

  function handleToggle(key: string, checked: boolean) {
    setChecklist((c) => ({ ...c, [key]: checked }));
    setError(null);
    startTransition(async () => {
      const result = await toggleChecklistItem(taskId, key as any, checked);
      if (result?.error) setError(result.error);
      else if (status === 'pending_packing') setStatus('packing');
    });
  }

  function handleMarkPacked() {
    setError(null);
    startTransition(async () => {
      const result = await markTaskPacked(taskId);
      if (result?.error) setError(result.error);
      else setStatus('packed');
    });
  }

  if (status === 'packed') {
    return (
      <div className="rounded-xl2 border border-brand-100 bg-brand-50 p-5">
        <p className="font-medium">Order #{orderNumber}</p>
        <p className="text-sm text-brand-700 mt-1">Packed ✓</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl2 border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium">Order #{orderNumber}</p>
          <p className="text-sm text-gray-500 capitalize">{status.replace('_', ' ')}</p>
        </div>
        <button
          onClick={handleMarkPacked}
          disabled={!allChecked || isPending}
          className="text-sm rounded-full bg-brand-600 text-white px-4 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          title={!allChecked ? 'Complete every checklist item first' : undefined}
        >
          Mark Packed
        </button>
      </div>

      <ul className="mt-3 space-y-1.5 text-sm">
        {CHECKLIST_ITEMS.map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            <input
              type="checkbox"
              className="rounded"
              checked={checklist[item.key] === true}
              onChange={(e) => handleToggle(item.key, e.target.checked)}
              disabled={isPending}
            />
            <label>{item.label}</label>
          </li>
        ))}
      </ul>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  );
}
