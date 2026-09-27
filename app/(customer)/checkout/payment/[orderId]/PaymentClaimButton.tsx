'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitPaymentClaim } from '@/app/actions/payments';

export function PaymentClaimButton({ orderId }: { orderId: string }) {
  const router = useRouter();

  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!transactionId.trim()) {
      setError('Please enter your UPI transaction ID.');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await submitPaymentClaim(
      orderId,
      transactionId.trim()
    );

    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 text-left"
      noValidate
    >
      <label
        htmlFor="transactionId"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        UPI Transaction ID
      </label>

      <input
        id="transactionId"
        name="transactionId"
        type="text"
        value={transactionId}
        onChange={(event) => {
          setTransactionId(event.target.value);
        }}
        placeholder="Enter UPI transaction ID"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        inputMode="text"
        maxLength={100}
        disabled={loading}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 disabled:bg-gray-100"
      />

      <p className="mt-2 text-xs text-gray-500">
        Enter the transaction ID shown in your UPI app after completing
        the payment.
      </p>

      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full rounded-full bg-brand-600 text-white py-3 font-medium hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? 'Submitting…' : "I've Completed Payment"}
      </button>

      {error && (
        <p className="text-sm text-red-600 mt-3">
          {error}
        </p>
      )}
    </form>
  );
}
