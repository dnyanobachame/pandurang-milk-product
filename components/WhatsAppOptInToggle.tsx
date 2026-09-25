'use client';

import { useState } from 'react';
import { setWhatsAppOptIn } from '@/app/actions/notifications-settings';

export function WhatsAppOptInToggle({ initialOptIn }: { initialOptIn: boolean }) {
  const [optIn, setOptIn] = useState(initialOptIn);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setLoading(true);
    setError(null);
    const next = !optIn;
    const result = await setWhatsAppOptIn(next);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setOptIn(next);
  }

  return (
    <div>
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={optIn} onChange={handleToggle} disabled={loading} className="rounded" />
        <span className="text-sm">
          Send me order updates on WhatsApp
        </span>
      </label>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
