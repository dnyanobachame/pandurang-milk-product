'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createSupportTicket } from '@/app/actions/support';

const CATEGORIES = [
  'Delivery issue',
  'Product issue',
  'Payment issue',
  'Order question',
  'Other',
];

export default function NewSupportTicketPage() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError(null);

    const result = await createSupportTicket({
      category,
      description,
    });

    if (result?.error) {
      setSaving(false);
      setError(result.error);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-6 sm:py-8">
        {/* Back */}
        <Link
          href="/dashboard/support"
          className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-medium text-gray-600 transition hover:bg-white hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <span aria-hidden="true">←</span>
          Support
        </Link>

        {/* Header */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl">
              💬
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                Customer Care
              </p>

              <h1 className="mt-1 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                New Support Request
              </h1>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Tell us what you need help with and our team can review your
                request.
              </p>
            </div>
          </div>
        </section>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
        >
          {/* Category */}
          <label className="block">
            <span className="text-sm font-semibold text-gray-800">
              Category
            </span>

            <span className="mt-1 block text-xs text-gray-500">
              Choose the option that best matches your request.
            </span>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-3 min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          {/* Description */}
          <label className="mt-5 block">
            <span className="text-sm font-semibold text-gray-800">
              Describe the issue
            </span>

            <span className="mt-1 block text-xs text-gray-500">
              Please provide enough detail so we can understand and resolve
              your request.
            </span>

            <textarea
              required
              rows={7}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your issue..."
              className="mt-3 w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />

            <span className="mt-1 block text-right text-xs text-gray-400">
              {description.length} characters
            </span>
          </label>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <p className="font-semibold">Unable to submit request</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
            <Link
              href="/dashboard/support"
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving || !description.trim()}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>

        {/* Help note */}
        <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 p-4">
          <p className="text-sm font-semibold text-brand-900">
            Need help quickly?
          </p>

          <p className="mt-1 text-xs leading-5 text-brand-700">
            Include your order number or relevant details in the description
            when your request is related to an order.
          </p>
        </div>
      </div>
    </main>
  );
}