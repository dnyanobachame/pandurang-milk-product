'use client';

import { useState } from 'react';
import { sendPaymentReminder } from '@/app/actions/payments';

export function SendReminderButton({ orderId }: { orderId: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');

  async function handleClick() {
    setState('sending');
    const result = await sendPaymentReminder(orderId);
    setState(result?.error ? 'idle' : 'sent');
  }

  if (state === 'sent') {
    return <span className="text-xs text-gray-400">Reminder sent</span>;
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === 'sending'}
      className="text-xs rounded-full border border-amber-300 text-amber-700 px-3 py-1 disabled:opacity-60"
    >
      {state === 'sending' ? 'Sending…' : 'Send Reminder'}
    </button>
  );
}
