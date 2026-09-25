'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { assignDeliveryPartner } from '@/app/actions/delivery';

export function AssignPartnerForm({
  orderId, partners,
}: {
  orderId: string;
  partners: { id: string; name: string; onDuty: boolean }[];
}) {
  const router = useRouter();
  const [partnerId, setPartnerId] = useState(partners.find((p) => p.onDuty)?.id ?? partners[0]?.id ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign() {
    if (!partnerId) return;
    setLoading(true);
    setError(null);
    const result = await assignDeliveryPartner(orderId, partnerId);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (partners.length === 0) {
    return <p className="text-xs text-gray-400">No delivery partners available</p>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <select
          value={partnerId}
          onChange={(e) => setPartnerId(e.target.value)}
          className="text-sm rounded-lg border border-gray-200 px-2 py-1"
        >
          {partners.map((p) => (
            <option key={p.id} value={p.id}>{p.name}{p.onDuty ? ' · on duty' : ''}</option>
          ))}
        </select>
        <button
          onClick={handleAssign}
          disabled={loading}
          className="text-sm rounded-full bg-brand-600 text-white px-3 py-1 disabled:opacity-60"
        >
          {loading ? 'Assigning…' : 'Assign'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
