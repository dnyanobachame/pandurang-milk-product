'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { resolveTicket } from '@/app/actions/support';

export function ResolveTicketForm({
  ticketId,
}: {
  ticketId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (saving) return;

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
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="mt-2 inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-200 bg-brand-50 px-4 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-1"
      >
        Resolve
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4"
      aria-label="Resolve support ticket"
    >
      <div>
        <label
          htmlFor={`resolution-${ticketId}`}
          className="mb-1.5 block text-xs font-semibold text-slate-700"
        >
          Resolution notes
        </label>

        <textarea
          id={`resolution-${ticketId}`}
          required
          rows={3}
          value={resolution}
          placeholder="Describe how this ticket was resolved..."
          onChange={(e) => setResolution(e.target.value)}
          disabled={saving}
          className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
      </div>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={saving}
          aria-busy={saving}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <>
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
              Saving…
            </>
          ) : (
            'Mark Resolved'
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            if (saving) return;

            setOpen(false);
            setResolution('');
            setError(null);
          }}
          disabled={saving}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}