'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
} from '@/app/actions/subscriptions';

type SubscriptionActionResult = {
  error?: string;
  ok?: boolean;
};

export function SubscriptionControls({
  subscriptionId,
  isPaused,
}: {
  subscriptionId: string;
  isPaused: boolean;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(
    action: (
      id: string
    ) => Promise<SubscriptionActionResult>
  ) {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await action(subscriptionId);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setConfirmCancel(false);
      router.refresh();
    } catch {
      setError(
        'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (confirmCancel) {
    return (
      <div className="mt-3 w-full rounded-lg border border-red-100 bg-red-50 p-3">
        <p className="text-sm font-medium text-gray-800">
          Cancel this subscription?
        </p>

        <p className="mt-1 text-xs leading-5 text-gray-600">
          This will stop the subscription from continuing.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-2 text-xs font-medium text-red-600"
          >
            {error}
          </p>
        )}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={loading}
            onClick={() => run(cancelSubscription)}
            className="min-h-11 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Cancelling…' : 'Yes, cancel'}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setConfirmCancel(false);
              setError(null);
            }}
            className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Keep Subscription
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 w-full">
      {error && (
        <div
          role="alert"
          className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
        >
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {isPaused ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => run(resumeSubscription)}
            className="min-h-10 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Resuming…' : 'Resume'}
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={() => run(pauseSubscription)}
            className="min-h-10 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Pausing…' : 'Pause'}
          </button>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setError(null);
            setConfirmCancel(true);
          }}
          className="min-h-10 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}