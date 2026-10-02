'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRate } from '@/app/actions/rate-chart';

export default function RateChartAddForm({
  today,
}: {
  today: string;
}) {
  const router = useRouter();

  const [milkType, setMilkType] = useState<'cow' | 'buffalo'>('cow');
  const [fat, setFat] = useState('');
  const [snf, setSnf] = useState('');
  const [rate, setRate] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(today);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) return;

    setError('');
    setSaving(true);

    try {
      const formData = new FormData(event.currentTarget);

      const result = await createRate(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      router.push('/admin/production/rate-chart');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save the rate.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6"
      aria-labelledby="add-rate-title"
    >
      <div className="mb-5">
        <h2
          id="add-rate-title"
          className="text-base font-bold text-slate-900"
        >
          Add Rate
        </h2>

        <p className="mt-1 text-sm leading-5 text-slate-500">
          Add an exact FAT + SNF combination to the rate chart.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5"
      >
        <div>
          <label
            htmlFor="milk-type"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            Milk Type
          </label>

          <select
            id="milk-type"
            name="milk_type"
            value={milkType}
            onChange={(event) =>
              setMilkType(
                event.target.value as 'cow' | 'buffalo'
              )
            }
            required
            disabled={saving}
            className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            <option value="cow">Cow</option>
            <option value="buffalo">Buffalo</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="fat-percent"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            FAT %
          </label>

          <input
            id="fat-percent"
            name="fat_percent"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={fat}
            onChange={(event) => setFat(event.target.value)}
            required
            placeholder="3.50"
            disabled={saving}
            className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        <div>
          <label
            htmlFor="snf-percent"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            SNF %
          </label>

          <input
            id="snf-percent"
            name="snf_percent"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={snf}
            onChange={(event) => setSnf(event.target.value)}
            required
            placeholder="8.50"
            disabled={saving}
            className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        <div>
          <label
            htmlFor="rate-per-litre"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            Rate / Litre
          </label>

          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500"
            >
              ₹
            </span>

            <input
              id="rate-per-litre"
              name="rate_per_litre"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              required
              placeholder="38.00"
              disabled={saving}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="effective-from"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            Effective From
          </label>

          <input
            id="effective-from"
            name="effective_from"
            type="date"
            value={effectiveFrom}
            onChange={(event) =>
              setEffectiveFrom(event.target.value)
            }
            required
            disabled={saving}
            className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        <div className="md:col-span-2 lg:col-span-5">
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
            >
              <div className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-0.5 font-bold"
                >
                  !
                </span>

                <span>{error}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 md:col-span-2 lg:col-span-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">
            Rates are matched using exact milk type + FAT + SNF
            values.
          </p>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={() =>
                router.push('/admin/production/rate-chart')
              }
              disabled={saving}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              aria-busy={saving}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  />
                  Saving…
                </>
              ) : (
                'Save Rate'
              )}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}