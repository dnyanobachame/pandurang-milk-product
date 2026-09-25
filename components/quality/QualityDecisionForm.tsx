'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { recordQualityDecision } from '@/app/actions/production';

export function QualityDecisionForm({
  referenceType, referenceId,
}: {
  referenceType: 'milk_collection' | 'production_batch';
  referenceId: string;
}) {
  const router = useRouter();
  const [fat, setFat] = useState('');
  const [snf, setSnf] = useState('');
  const [temp, setTemp] = useState('');
  const [acidity, setAcidity] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(status: 'passed' | 'rejected') {
    setSubmitting(true);
    setError(null);
    const result = await recordQualityDecision({
      referenceType, referenceId, status,
      fatPercent: fat ? Number(fat) : undefined,
      snfPercent: snf ? Number(snf) : undefined,
      temperature: temp ? Number(temp) : undefined,
      acidity: acidity ? Number(acidity) : undefined,
      notes: notes || undefined,
    });
    setSubmitting(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <div className="grid grid-cols-4 gap-2 mb-2">
        <input placeholder="Fat %" value={fat} onChange={(e) => setFat(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1 text-sm" />
        <input placeholder="SNF %" value={snf} onChange={(e) => setSnf(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1 text-sm" />
        <input placeholder="Temp °C" value={temp} onChange={(e) => setTemp(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1 text-sm" />
        <input placeholder="Acidity" value={acidity} onChange={(e) => setAcidity(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1 text-sm" />
      </div>
      <input
        placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-2 py-1 text-sm mb-2"
      />
      <div className="flex gap-2">
        <button
          onClick={() => decide('passed')}
          disabled={submitting}
          className="flex-1 rounded-full bg-brand-600 text-white text-sm py-1.5 disabled:opacity-60"
        >
          Pass
        </button>
        <button
          onClick={() => decide('rejected')}
          disabled={submitting}
          className="flex-1 rounded-full border border-red-300 text-red-600 text-sm py-1.5 disabled:opacity-60"
        >
          Reject
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
