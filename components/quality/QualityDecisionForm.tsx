'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { recordQualityDecision } from '@/app/actions/production';

type QualityDecisionFormProps = {
  referenceType: 'milk_collection' | 'production_batch';
  referenceId: string;
};

export function QualityDecisionForm({
  referenceType,
  referenceId,
}: QualityDecisionFormProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [fat, setFat] = useState('');
  const [snf, setSnf] = useState('');
  const [temp, setTemp] = useState('');
  const [acidity, setAcidity] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parseOptionalNumber(value: string) {
    const trimmed = value.trim();

    if (!trimmed) {
      return undefined;
    }

    const parsed = Number(trimmed);

    return Number.isFinite(parsed) ? parsed : null;
  }

  function handleOpen() {
    if (submitting) return;

    setError(null);
    setOpen(true);
  }

  function handleClose() {
    if (submitting) return;

    setError(null);
    setOpen(false);
  }

  async function decide(status: 'passed' | 'rejected') {
    if (submitting) return;

    const fatValue = parseOptionalNumber(fat);
    const snfValue = parseOptionalNumber(snf);
    const temperatureValue = parseOptionalNumber(temp);
    const acidityValue = parseOptionalNumber(acidity);

    if (
      fatValue === null ||
      snfValue === null ||
      temperatureValue === null ||
      acidityValue === null
    ) {
      setError('Enter valid numeric values for the quality measurements.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await recordQualityDecision({
        referenceType,
        referenceId,
        status,
        fatPercent: fatValue ?? undefined,
        snfPercent: snfValue ?? undefined,
        temperature: temperatureValue ?? undefined,
        acidity: acidityValue ?? undefined,
        notes: notes.trim() || undefined,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError('Unable to save the quality decision. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClassName =
    'mt-1 min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50';

  if (!open) {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex min-h-[48px] w-full touch-manipulation items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          aria-label="Open quality review form"
        >
          Review Quality
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label="Quality decision form"
      className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-950">
            Quality Decision
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Enter the quality measurements before approving or rejecting this
            item.
          </p>
        </div>

        <button
          type="button"
          onClick={handleClose}
          disabled={submitting}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Close quality review form"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Fat %
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            placeholder="e.g. 4.0"
            disabled={submitting}
            className={inputClassName}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          SNF %
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={snf}
            onChange={(e) => setSnf(e.target.value)}
            placeholder="e.g. 8.5"
            disabled={submitting}
            className={inputClassName}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Temperature °C
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            placeholder="e.g. 4"
            disabled={submitting}
            className={inputClassName}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Acidity
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={acidity}
            onChange={(e) => setAcidity(e.target.value)}
            placeholder="e.g. 0.14"
            disabled={submitting}
            className={inputClassName}
          />
        </label>
      </div>

      <label className="mt-3 block text-sm font-semibold text-slate-700">
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional quality notes"
          rows={3}
          disabled={submitting}
          className="mt-1 min-h-[96px] w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50"
        />
      </label>

      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => decide('passed')}
          disabled={submitting}
          className="inline-flex min-h-[50px] touch-manipulation items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Saving…' : '✓ Pass Quality'}
        </button>

        <button
          type="button"
          onClick={() => decide('rejected')}
          disabled={submitting}
          className="inline-flex min-h-[50px] touch-manipulation items-center justify-center rounded-xl border border-red-300 bg-white px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Saving…' : '✕ Reject Quality'}
        </button>
      </div>
    </section>
  );
}