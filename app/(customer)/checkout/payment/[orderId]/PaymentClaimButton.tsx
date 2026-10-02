
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitPaymentClaim } from '@/app/actions/payments';

export function PaymentClaimButton({
  orderId,
}: {
  orderId: string;
}) {
  const router = useRouter();

  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedTransactionId = transactionId.trim();

    if (!trimmedTransactionId) {
      setError('Please enter your UPI transaction ID.');
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await submitPaymentClaim(
        orderId,
        trimmedTransactionId,
      );

      if (result?.error) {
        setLoading(false);
        setError(result.error);
        return;
      }

      router.refresh();
    } catch {
      setLoading(false);
      setError(
        'Unable to submit your payment claim. Please try again.',
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-5 text-left"
      noValidate
    >
      <div className="mb-3">
        <label
          htmlFor="transactionId"
          className="block text-sm font-bold text-slate-800"
        >
          UPI Transaction ID
        </label>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          Enter the transaction ID shown in your UPI app after payment.
        </p>
      </div>

      <input
        id="transactionId"
        name="transactionId"
        type="text"
        value={transactionId}
        onChange={(event) => {
          setTransactionId(event.target.value);
          if (error) {
            setError(null);
          }
        }}
        placeholder="Enter transaction ID"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        inputMode="text"
        maxLength={100}
        disabled={loading}
        aria-invalid={Boolean(error)}
        aria-describedby="transaction-id-help payment-claim-error"
        className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-100"
      />

      <p
        id="transaction-id-help"
        className="mt-2 text-[11px] leading-5 text-slate-400"
      >
        Maximum 100 characters.
      </p>

      {error && (
        <div
          id="payment-claim-error"
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3"
        >
          <p className="text-xs font-medium leading-5 text-red-700">
            {error}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Submitting…' : "I've Completed Payment"}
      </button>

      <p className="mt-3 text-center text-[10px] leading-4 text-slate-400">
        Your payment will be reviewed before it is marked as verified.
      </p>
    </form>
  );
}
