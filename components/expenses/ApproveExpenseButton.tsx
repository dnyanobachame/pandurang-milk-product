'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { approveExpense } from '@/app/actions/expenses';

type ApproveExpenseButtonProps = {
  expenseId: string;
};

export function ApproveExpenseButton({
  expenseId,
}: ApproveExpenseButtonProps) {
  const router = useRouter();

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleRequestApproval() {
    if (loading) return;

    setError(null);
    setShowConfirmation(true);
  }

  function handleCancel() {
    if (loading) return;

    setShowConfirmation(false);
    setError(null);
  }

  async function handleConfirm() {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await approveExpense(expenseId);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setShowConfirmation(false);
      router.refresh();
    } catch (err) {
      console.error('Expense approval failed:', err);
      setError('Unable to approve this expense. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (showConfirmation) {
    return (
      <div className="w-full max-w-xs rounded-xl border border-amber-200 bg-amber-50 p-3">
        <p className="text-sm font-bold text-amber-900">
          Approve this expense?
        </p>

        <p className="mt-1 text-xs leading-5 text-amber-800">
          This will approve the expense and update its status.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-brand-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Approving…' : 'Confirm'}
          </button>
        </div>

        {error && (
          <p
            role="alert"
            aria-live="polite"
            className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleRequestApproval}
        disabled={loading}
        className="inline-flex min-h-[44px] touch-manipulation items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Approve
      </button>

      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}