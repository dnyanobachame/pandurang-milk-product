'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteSupplier,
  toggleSupplierStatus,
} from '@/app/actions/suppliers';

type Props = {
  supplierId: string;
  isActive: boolean;
};

export default function SupplierActions({
  supplierId,
  isActive,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(
    action: () => Promise<{ error?: string; success?: boolean }>
  ) {
    if (isPending) return;

    setError(null);

    startTransition(async () => {
      const result = await action();

      if (result?.error) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  function handleDelete() {
    if (
      !window.confirm(
        'Delete this supplier permanently? Suppliers with milk collection history cannot be deleted.'
      )
    ) {
      return;
    }

    run(() => deleteSupplier(supplierId));
  }

  function handleToggle() {
    const nextStatus = !isActive;

    if (
      !window.confirm(
        nextStatus
          ? 'Activate this supplier?'
          : 'Deactivate this supplier? Existing records will be preserved.'
      )
    ) {
      return;
    }

    run(() => toggleSupplierStatus(supplierId, nextStatus));
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          aria-busy={isPending}
          aria-label={
            isPending
              ? 'Updating supplier status'
              : isActive
                ? 'Deactivate supplier'
                : 'Activate supplier'
          }
          className={`
            inline-flex min-h-11 items-center justify-center gap-2
            rounded-xl border px-4
            text-xs font-semibold
            transition
            focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-1
            disabled:cursor-not-allowed disabled:opacity-50
            ${
              isActive
                ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }
          `}
        >
          {isPending ? (
            <>
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current"
              />
              Saving…
            </>
          ) : isActive ? (
            'Deactivate'
          ) : (
            'Activate'
          )}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          aria-busy={isPending}
          aria-label="Delete supplier"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-xs font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          aria-live="assertive"
          className="max-w-xs rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-xs font-medium leading-5 text-red-700 sm:text-right"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}