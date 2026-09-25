'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { resolveTicket } from '@/app/actions/support';

export function ResolveTicketForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await resolveTicket(ticketId, resolution);
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-2 text-xs text-brand-700 font-medium">
        Resolve
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      <textarea
        required rows={2} value={resolution} placeholder="Resolution notes"
        onChange={(e) => setResolution(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-2 py-1 text-sm"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="text-xs rounded-full bg-brand-600 text-white px-3 py-1 disabled:opacity-60">
          {saving ? 'Saving…' : 'Mark Resolved'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs rounded-full border border-gray-200 px-3 py-1">
          Cancel
        </button>
      </div>
    </form>
  );
}
