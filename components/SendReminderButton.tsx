'use client';

import { useState } from 'react';
import { sendPaymentReminder } from '@/app/actions/payments';

type ReminderState = 'idle' | 'sending' | 'sent';

export function SendReminderButton({ orderId }: { orderId: string }) {
  const [state, setState] = useState<ReminderState>('idle');
  const [error, setError] = useState('');

  async function handleClick() {
    if (state === 'sending' || state === 'sent') {
      return;
    }

    setState('sending');
    setError('');

    try {
      const result = await sendPaymentReminder(orderId);

      if (result?.error) {
        setState('idle');
        setError(result.error);
        return;
      }

      setState('sent');
    } catch {
      setState('idle');
      setError('Unable to send payment reminder. Please try again.');
    }
  }

  if (state === 'sent') {
    return (
      <span
        className="inline-flex min-h-11 items-center rounded-full bg-green-50 px-3 py-2 text-xs font-medium text-green-700"
        role="status"
      >
        ✓ Reminder sent
      </span>
    );
  }

  return (
    <div className="flex max-w-full flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={state === 'sending'}
        aria-busy={state === 'sending'}
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === 'sending' ? 'Sending…' : 'Send Reminder'}
      </button>

      {error && (
        <p
          className="max-w-xs text-xs leading-5 text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}