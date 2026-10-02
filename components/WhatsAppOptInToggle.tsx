'use client';

import { useState } from 'react';
import { setWhatsAppOptIn } from '@/app/actions/notifications-settings';

export function WhatsAppOptInToggle({
  initialOptIn,
}: {
  initialOptIn: boolean;
}) {
  const [optIn, setOptIn] = useState(initialOptIn);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    if (loading) return;

    const next = !optIn;

    setLoading(true);
    setError(null);

    try {
      const result = await setWhatsAppOptIn(next);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setOptIn(next);
    } catch {
      setError(
        'Could not update WhatsApp notification settings. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full min-w-0">
      <label
        className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 transition-colors ${
          loading
            ? 'cursor-not-allowed bg-gray-50 opacity-70'
            : 'bg-white hover:bg-gray-50'
        }`}
      >
        <input
          type="checkbox"
          checked={optIn}
          onChange={handleToggle}
          disabled={loading}
          aria-describedby="whatsapp-opt-in-description"
          className="h-5 w-5 shrink-0 rounded border-gray-300 text-brand-600 focus:ring-2 focus:ring-brand-500"
        />

        <span
          id="whatsapp-opt-in-description"
          className="text-sm leading-5 text-gray-700"
        >
          Send me order updates on WhatsApp
        </span>

        {loading && (
          <span className="ml-auto shrink-0 text-xs text-gray-500">
            Saving…
          </span>
        )}
      </label>

      {error && (
        <p
          role="alert"
          className="mt-2 text-xs font-medium leading-5 text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}