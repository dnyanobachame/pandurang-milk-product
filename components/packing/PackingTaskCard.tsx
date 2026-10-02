'use client';

import { useState, useTransition } from 'react';
import { toggleChecklistItem, markTaskPacked } from '@/app/actions/packing';

const CHECKLIST_ITEMS = [
  { key: 'correct_customer', label: 'Correct customer' },
  { key: 'correct_product', label: 'Correct product' },
  { key: 'correct_quantity', label: 'Correct quantity' },
  { key: 'correct_batch', label: 'Correct batch' },
  { key: 'expiry_checked', label: 'Expiry checked' },
  { key: 'packaging_intact', label: 'Packaging intact' },
  { key: 'invoice_included', label: 'Invoice included' },
  { key: 'delivery_label_attached', label: 'Delivery label attached' },
] as const;

type ChecklistKey = (typeof CHECKLIST_ITEMS)[number]['key'];

type PackingTaskCardProps = {
  taskId: string;
  orderNumber: string;
  status: string;
  checklist: Record<string, boolean>;
};

export function PackingTaskCard({
  taskId,
  orderNumber,
  status: initialStatus,
  checklist: initialChecklist,
}: PackingTaskCardProps) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>(
    initialChecklist ?? {}
  );
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const allChecked = CHECKLIST_ITEMS.every(
    (item) => checklist[item.key] === true
  );

  function handleToggle(key: ChecklistKey, checked: boolean) {
    if (isPending) return;

    const previousValue = checklist[key] === true;

    setChecklist((current) => ({
      ...current,
      [key]: checked,
    }));
    setError(null);

    startTransition(async () => {
      try {
        const result = await toggleChecklistItem(taskId, key, checked);

        if (result?.error) {
          setChecklist((current) => ({
            ...current,
            [key]: previousValue,
          }));
          setError(result.error);
          return;
        }

        if (status === 'pending_packing') {
          setStatus('packing');
        }
      } catch {
        setChecklist((current) => ({
          ...current,
          [key]: previousValue,
        }));
        setError('Unable to update the packing checklist. Please try again.');
      }
    });
  }

  function handleMarkPacked() {
    if (!allChecked || isPending) return;

    setError(null);

    startTransition(async () => {
      try {
        const result = await markTaskPacked(taskId);

        if (result?.error) {
          setError(result.error);
          return;
        }

        setStatus('packed');
      } catch {
        setError('Unable to mark this order as packed. Please try again.');
      }
    });
  }

  if (status === 'packed') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-950">
              Order #{orderNumber}
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-700">
              ✓ Packed
            </p>
          </div>

          <span className="inline-flex min-h-[36px] items-center rounded-full bg-emerald-100 px-3 text-xs font-bold text-emerald-800">
            Complete
          </span>
        </div>
      </div>
    );
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-base font-bold text-slate-950">
            Order #{orderNumber}
          </p>

          <p className="mt-1 text-sm capitalize text-slate-500">
            {status.replaceAll('_', ' ')}
          </p>

          <p className="mt-2 text-xs font-medium text-slate-500">
            {CHECKLIST_ITEMS.filter(
              (item) => checklist[item.key] === true
            ).length}{' '}
            of {CHECKLIST_ITEMS.length} checks complete
          </p>
        </div>

        <button
          type="button"
          onClick={handleMarkPacked}
          disabled={!allChecked || isPending}
          className="inline-flex min-h-[48px] w-full touch-manipulation items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          title={
            !allChecked
              ? 'Complete every checklist item first'
              : undefined
          }
        >
          {isPending ? 'Saving…' : 'Mark Packed'}
        </button>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
          Packing checklist
        </p>

        <ul className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => {
            const checked = checklist[item.key] === true;

            return (
              <li key={item.key}>
                <label
                  className={`flex min-h-[52px] touch-manipulation cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition ${
                    checked
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  } ${
                    isPending
                      ? 'cursor-not-allowed opacity-70'
                      : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      handleToggle(item.key, event.target.checked)
                    }
                    disabled={isPending}
                    className="h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed"
                  />

                  <span
                    className={`text-sm font-medium ${
                      checked
                        ? 'text-emerald-800'
                        : 'text-slate-700'
                    }`}
                  >
                    {item.label}
                  </span>

                  {checked && (
                    <span className="ml-auto text-sm font-bold text-emerald-600">
                      ✓
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      )}
    </article>
  );
}