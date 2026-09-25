'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { pauseSubscription, resumeSubscription, cancelSubscription } from '@/app/actions/subscriptions';

export function SubscriptionControls({
  subscriptionId, isPaused,
}: {
  subscriptionId: string;
  isPaused: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run(action: (id: string) => Promise<{ error?: string; ok?: boolean }>) {
    setLoading(true);
    await action(subscriptionId);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2 mt-2">
      {isPaused ? (
        <button
          disabled={loading}
          onClick={() => run(resumeSubscription)}
          className="text-xs rounded-full bg-brand-600 text-white px-3 py-1"
        >
          Resume
        </button>
      ) : (
        <button
          disabled={loading}
          onClick={() => run(pauseSubscription)}
          className="text-xs rounded-full border border-gray-300 px-3 py-1"
        >
          Pause
        </button>
      )}
      <button
        disabled={loading}
        onClick={() => {
          if (confirm('Cancel this subscription?')) run(cancelSubscription);
        }}
        className="text-xs rounded-full border border-red-300 text-red-600 px-3 py-1"
      >
        Cancel
      </button>
    </div>
  );
}
