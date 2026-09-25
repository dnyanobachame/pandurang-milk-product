'use client';

import { useState } from 'react';
import { createSupportTicket } from '@/app/actions/support';

const CATEGORIES = ['Delivery issue', 'Product issue', 'Payment issue', 'Order question', 'Other'];

export default function NewSupportTicketPage() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await createSupportTicket({ category, description });
    if (result?.error) {
      setSaving(false);
      setError(result.error);
    }
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">New Support Request</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium">
          Category
          <select
            value={category} onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Describe the issue
          <textarea
            required rows={5} value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit" disabled={saving}
          className="w-full rounded-full bg-brand-600 text-white py-2.5 font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? 'Submitting…' : 'Submit Request'}
        </button>
      </form>
    </main>
  );
}
