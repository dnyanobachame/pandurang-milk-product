'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDeliveryArea } from '@/app/actions/delivery-areas';

export function NewAreaForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    cityOrVillage: '',
    pinCode: '',
    deliveryFee: '30',
    freeDeliveryAbove: '',
    minOrderAmount: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (saving) return;

    setSaving(true);
    setError(null);

    const deliveryFee = Number(form.deliveryFee);
    const freeDeliveryAbove = form.freeDeliveryAbove
      ? Number(form.freeDeliveryAbove)
      : undefined;
    const minOrderAmount = form.minOrderAmount
      ? Number(form.minOrderAmount)
      : undefined;

    if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
      setError('Enter a valid delivery fee.');
      setSaving(false);
      return;
    }

    if (
      freeDeliveryAbove !== undefined &&
      (!Number.isFinite(freeDeliveryAbove) ||
        freeDeliveryAbove < 0)
    ) {
      setError('Enter a valid free-delivery threshold.');
      setSaving(false);
      return;
    }

    if (
      minOrderAmount !== undefined &&
      (!Number.isFinite(minOrderAmount) ||
        minOrderAmount < 0)
    ) {
      setError('Enter a valid minimum order amount.');
      setSaving(false);
      return;
    }

    const result = await createDeliveryArea({
      cityOrVillage: form.cityOrVillage,
      pinCode: form.pinCode || undefined,
      deliveryFee,
      freeDeliveryAbove,
      minOrderAmount,
    });

    setSaving(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    setForm({
      cityOrVillage: '',
      pinCode: '',
      deliveryFee: '30',
      freeDeliveryAbove: '',
      minOrderAmount: '',
    });

    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      aria-labelledby="new-area-title"
    >
      <div>
        <h2
          id="new-area-title"
          className="text-base font-bold text-slate-900"
        >
          Add New Area
        </h2>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          Configure delivery availability and charges for a village or city.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="area-city-village"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            Village / City
          </label>

          <input
            id="area-city-village"
            required
            placeholder="Enter village or city"
            value={form.cityOrVillage}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                cityOrVillage: e.target.value,
              }))
            }
            disabled={saving}
            className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        <div>
          <label
            htmlFor="area-pin-code"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            PIN Code
            <span className="ml-1 font-normal text-slate-400">
              (optional)
            </span>
          </label>

          <input
            id="area-pin-code"
            inputMode="numeric"
            placeholder="Enter PIN code"
            value={form.pinCode}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                pinCode: e.target.value,
              }))
            }
            disabled={saving}
            className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        <div>
          <label
            htmlFor="area-delivery-fee"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            Delivery fee
          </label>

          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500"
            >
              ₹
            </span>

            <input
              id="area-delivery-fee"
              required
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.deliveryFee}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  deliveryFee: e.target.value,
                }))
              }
              disabled={saving}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-sm font-medium text-slate-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="area-free-above"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            Free delivery above
            <span className="ml-1 font-normal text-slate-400">
              (optional)
            </span>
          </label>

          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500"
            >
              ₹
            </span>

            <input
              id="area-free-above"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="None"
              value={form.freeDeliveryAbove}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  freeDeliveryAbove: e.target.value,
                }))
              }
              disabled={saving}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="area-min-order"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            Minimum order amount
            <span className="ml-1 font-normal text-slate-400">
              (optional)
            </span>
          </label>

          <div className="relative sm:max-w-[calc(50%-0.375rem)]">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500"
            >
              ₹
            </span>

            <input
              id="area-min-order"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="No minimum"
              value={form.minOrderAmount}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  minOrderAmount: e.target.value,
                }))
              }
              disabled={saving}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700"
        >
          {error}
        </div>
      )}

      <div className="flex justify-end border-t border-slate-100 pt-4">
        <button
          type="submit"
          disabled={saving}
          aria-busy={saving}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {saving ? (
            <>
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
              Adding…
            </>
          ) : (
            'Add Area'
          )}
        </button>
      </div>
    </form>
  );
}