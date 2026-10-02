'use client';

import { useState, useTransition } from 'react';
import { sendMilkCollectionWhatsApp } from '@/app/actions/send-milk-collection-whatsapp';

export default function MilkCollectionWhatsAppButton({
  collectionId,
}: {
  collectionId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState('');

  function handleSend() {
    setError('');
    setMessage(null);

    startTransition(async () => {
      const result =
        await sendMilkCollectionWhatsApp(collectionId);

      if (result?.error) {
        setError(result.error);
        return;
      }

      if ('success' in result && result.success) {
        setMessage(
          'messageId' in result && result.messageId
            ? 'WhatsApp message sent successfully.'
            : 'WhatsApp message accepted by the provider.'
        );
        return;
      }

      setError('WhatsApp message could not be sent.');
    });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleSend}
        disabled={isPending}
        aria-busy={isPending}
        aria-label={
          isPending
            ? 'Sending WhatsApp message to farmer'
            : 'Send milk collection details to farmer on WhatsApp'
        }
        className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
      >
        {isPending ? (
          <>
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
            Sending WhatsApp…
          </>
        ) : (
          <>
            <span
              aria-hidden="true"
              className="text-base leading-none"
            >
              💬
            </span>
            Send WhatsApp to Farmer
          </>
        )}
      </button>

      {message ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-5 text-emerald-800"
        >
          <div className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className="mt-0.5 font-bold"
            >
              ✓
            </span>
            <span>{message}</span>
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
        >
          <div className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className="mt-0.5 font-bold"
            >
              !
            </span>
            <span>{error}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}