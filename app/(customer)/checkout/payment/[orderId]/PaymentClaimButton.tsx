'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitPaymentClaim } from '@/app/actions/payments';

export function PaymentClaimButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const result = await submitPaymentClaim(orderId);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="mt-6 w-full rounded-full bg-brand-600 text-white py-3 font-medium hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? 'Submitting…' : "I've Completed Payment"}
      </button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </>
  );
}
