'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toggleWhatsAppEnabled } from '@/app/actions/whatsapp-admin';

export function WhatsAppEnabledToggle({
  initialEnabled,
}: {
  initialEnabled: boolean;
}) {
  const router = useRouter();

  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    if (loading) return;

    setLoading(true);
    setError(null);

    const next = !enabled;

    try {
      const result = await toggleWhatsAppEnabled(next);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setEnabled(next);
      router.refresh();
    } catch (err) {
      console.error('WhatsApp toggle failed:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update WhatsApp status.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        aria-pressed={enabled}
        aria-busy={loading}
        aria-label={
          enabled
            ? 'Disable WhatsApp'
            : 'Enable WhatsApp'
        }
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 ${
          enabled
            ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'
            : 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50'
        }`}
      >
        {loading ? (
          <>
            <span
              aria-hidden="true"
              className={`h-4 w-4 animate-spin rounded-full border-2 ${
                enabled
                  ? 'border-white/40 border-t-white'
                  : 'border-slate-300 border-t-slate-700'
              }`}
            />
            Saving…
          </>
        ) : enabled ? (
          'WhatsApp Enabled'
        ) : (
          'WhatsApp Disabled'
        )}
      </button>

      {error && (
        <p
          role="alert"
          aria-live="assertive"
          className="text-xs font-medium leading-5 text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}