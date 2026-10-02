'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toggleRateStatus } from '@/app/actions/rate-chart';

type RateStatusButtonProps = {
  id: string;
  active: boolean;
};

export default function RateStatusButton({
  id,
  active,
}: RateStatusButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    if (loading) return;

    setLoading(true);

    try {
      const result = await toggleRateStatus(id, !active);

      if (result.error) {
        window.alert(result.error);
        return;
      }

      router.refresh();
    } catch (error) {
      console.error('RATE STATUS UPDATE ERROR:', error);
      window.alert('Unable to update rate status.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      aria-busy={loading}
      aria-label={
        loading
          ? 'Updating rate status'
          : active
            ? 'Deactivate rate'
            : 'Activate rate'
      }
      className={`
        inline-flex min-h-11 min-w-[96px] items-center justify-center gap-2
        rounded-xl border px-3.5
        text-xs font-semibold
        transition
        focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-1
        disabled:cursor-not-allowed disabled:opacity-50
        ${
          active
            ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
        }
      `}
    >
      {loading ? (
        <>
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current"
          />
          Updating…
        </>
      ) : active ? (
        'Deactivate'
      ) : (
        'Activate'
      )}
    </button>
  );
}