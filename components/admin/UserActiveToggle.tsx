'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setUserActive } from '@/app/actions/staff';

export function UserActiveToggle({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (loading) return;

    setLoading(true);
    setError(null);

    const result = await setUserActive(
      userId,
      !isActive
    );

    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-busy={loading}
        aria-label={
          loading
            ? 'Updating user status'
            : isActive
              ? 'Deactivate user'
              : 'Activate user'
        }
        className={`
          inline-flex min-h-11 min-w-[104px] items-center justify-center
          gap-2 rounded-xl border px-3.5
          text-xs font-semibold
          transition
          focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-1
          disabled:cursor-not-allowed disabled:opacity-50
          ${
            isActive
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
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
        ) : (
          <>
            <span
              aria-hidden="true"
              className={`
                h-2 w-2 rounded-full
                ${
                  isActive
                    ? 'bg-emerald-600'
                    : 'bg-slate-400'
                }
              `}
            />

            {isActive ? 'Active' : 'Inactive'}
          </>
        )}
      </button>

      {error && (
        <p
          role="alert"
          aria-live="assertive"
          className="max-w-xs text-xs font-medium leading-5 text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}