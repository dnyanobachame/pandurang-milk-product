'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminVerifyPayment } from '@/app/actions/payments';

export function VerifyPaymentButton({
  orderId,
}: {
  orderId: string;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await adminVerifyPayment(orderId);

      if (result?.error) {
        setError(result.error);
        return;
      }

      router.refresh();
    } catch {
      setError(
        'Something went wrong while verifying the payment. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-busy={loading}
        className="min-h-11 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Verifying…' : 'Mark Paid'}
      </button>

      {error && (
        <p
          role="alert"
          className="max-w-xs text-xs font-medium leading-5 text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}