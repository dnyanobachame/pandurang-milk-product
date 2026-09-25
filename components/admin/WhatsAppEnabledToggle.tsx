'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toggleWhatsAppEnabled } from '@/app/actions/whatsapp-admin';

export function WhatsAppEnabledToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setLoading(true);
    setError(null);
    const next = !enabled;
    const result = await toggleWhatsAppEnabled(next);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setEnabled(next);
    router.refresh();
  }

  return (
    <div>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`text-sm rounded-full px-4 py-2 font-medium disabled:opacity-60 ${
          enabled ? 'bg-brand-600 text-white' : 'border border-gray-200 text-gray-700'
        }`}
      >
        {loading ? 'Saving…' : enabled ? 'WhatsApp Enabled' : 'WhatsApp Disabled'}
      </button>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
