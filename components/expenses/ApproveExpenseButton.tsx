'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { approveExpense } from '@/app/actions/expenses';

export function ApproveExpenseButton({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await approveExpense(expenseId);
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-xs rounded-full bg-brand-600 text-white px-3 py-1 disabled:opacity-60"
    >
      {loading ? 'Approving…' : 'Approve'}
    </button>
  );
}
