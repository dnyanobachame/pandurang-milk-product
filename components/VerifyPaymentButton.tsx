'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminVerifyPayment } from '@/app/actions/payments';

export function VerifyPaymentButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const result = await adminVerifyPayment(orderId);
    setLoading(false);
    if (result?.error) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-xs rounded-full bg-brand-600 text-white px-3 py-1 disabled:opacity-60"
    >
      {loading ? 'Verifying…' : 'Mark Paid'}
    </button>
  );
}
