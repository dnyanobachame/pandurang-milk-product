'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getMilkCollectionRate,
  recordMilkCollection,
} from '@/app/actions/production';
import MilkCollectionWhatsAppButton from '@/components/admin/MilkCollectionWhatsAppButton';

type Supplier = {
  id: string;
  name: string;
  supplier_code: string;
};

export default function NewMilkCollectionPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState({
    supplierId: '',
    milkType: 'cow',
    quantityLitres: '',
    fatPercent: '',
    snfPercent: '',
    temperature: '',
    ratePerLitre: '',
    collectionCenter: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateMessage, setRateMessage] = useState<string | null>(null);
  const [savedCollectionId, setSavedCollectionId] = useState<string | null>(null);
  const [savedCollection, setSavedCollection] = useState<{
    quantityLitres: number;
    ratePerLitre: number;
    totalAmount: number;
    qualityStatus: string;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from('suppliers')
      .select('id, name, supplier_code')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        setSuppliers(data ?? []);

        if (data?.[0]) {
          setForm((current) => ({
            ...current,
            supplierId: data[0].id,
          }));
        }
      });
  }, []);

  useEffect(() => {
    const fat = Number(form.fatPercent);
    const snf = Number(form.snfPercent);

    if (
      !form.fatPercent ||
      !form.snfPercent ||
      !Number.isFinite(fat) ||
      !Number.isFinite(snf) ||
      fat < 0 ||
      snf < 0
    ) {
      setRateLoading(false);
      setForm((current) => ({
        ...current,
        ratePerLitre: '',
      }));
      setRateMessage('Enter FAT and SNF to find the applicable rate.');
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      setRateLoading(true);
      setRateMessage('Checking Rate Chart…');

      const result = await getMilkCollectionRate({
        milkType: form.milkType,
        fatPercent: fat,
        snfPercent: snf,
      });

      if (cancelled) {
        return;
      }

      setRateLoading(false);

      if (result?.error) {
        setForm((current) => ({
          ...current,
          ratePerLitre: '',
        }));
        setRateMessage(result.error);
        return;
      }

      if (
        'ratePerLitre' in result &&
        result.ratePerLitre !== undefined &&
        result.ratePerLitre !== null
      ) {
        const matchedRate = result.ratePerLitre;

        setForm((current) => ({
          ...current,
          ratePerLitre: matchedRate.toFixed(2),
        }));

        setRateMessage(
          `Rate matched from Rate Chart • ₹${matchedRate.toFixed(2)}/L`
        );
      } else {
        setForm((current) => ({
          ...current,
          ratePerLitre: '',
        }));

        setRateMessage(
          'No matching Rate Chart entry found. Please import the correct Rate Chart entry through CSV.'
        );
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [form.milkType, form.fatPercent, form.snfPercent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.supplierId) {
      setError('Please select a supplier.');
      return;
    }

    if (!form.fatPercent || !form.snfPercent) {
      setError('Enter FAT and SNF so the Rate Chart can determine the rate.');
      return;
    }

    if (!form.ratePerLitre) {
      setError(
        'No applicable milk rate is available. Check the FAT/SNF values or import the matching Rate Chart entry.'
      );
      return;
    }

    setSaving(true);
    setError(null);

    const result = await recordMilkCollection({
      supplierId: form.supplierId,
      milkType: form.milkType,
      quantityLitres: Number(form.quantityLitres),
      fatPercent: form.fatPercent
        ? Number(form.fatPercent)
        : undefined,
      snfPercent: form.snfPercent
        ? Number(form.snfPercent)
        : undefined,
      temperature: form.temperature
        ? Number(form.temperature)
        : undefined,
      ratePerLitre: form.ratePerLitre
        ? Number(form.ratePerLitre)
        : undefined,
      collectionCenter: form.collectionCenter || undefined,
    });

    if ('error' in result && result.error) {
      setSaving(false);
      setError(result.error);
      return;
    }

    if ('success' in result && result.success && 'collection' in result && result.collection) {
      setSaving(false);
      setSavedCollectionId(result.collection.id);
      setSavedCollection({
        quantityLitres: result.collection.quantityLitres,
        ratePerLitre: result.collection.ratePerLitre,
        totalAmount: result.collection.totalAmount,
        qualityStatus: result.collection.qualityStatus,
      });
    }
  }

  const estimatedTotal =
    Number(form.quantityLitres || 0) *
    Number(form.ratePerLitre || 0);

  return (
    <main className="min-w-0 bg-slate-50 px-4 py-5 pb-8 md:px-8 md:py-7">
      <div className="mx-auto max-w-4xl">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link
                href="/admin/production/collections"
                className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 active:scale-[0.99]"
              >
                ← Milk Collections
              </Link>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                  New Collection
                </span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                  Quality starts on Hold
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                Record Milk Collection
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
                Enter the milk received from a farmer or supplier. Quality
                information can be reviewed through Quality Control.
              </p>
            </div>
          </div>
        </header>

        {savedCollectionId && savedCollection ? (
          <section className="mt-5 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm md:p-6">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xl text-white">
                  ✓
                </div>
                <div>
                  <h2 className="text-lg font-bold text-emerald-900">
                    Milk collection recorded
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    The collection was saved successfully and remains on Hold
                    until Quality Control clears it.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-100 bg-white p-4">
                  <p className="text-xs text-slate-500">Quantity</p>
                  <p className="mt-1 font-bold text-slate-900">
                    {savedCollection.quantityLitres.toFixed(2)} L
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-white p-4">
                  <p className="text-xs text-slate-500">Rate</p>
                  <p className="mt-1 font-bold text-slate-900">
                    ₹{savedCollection.ratePerLitre.toFixed(2)}/L
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-white p-4">
                  <p className="text-xs text-slate-500">Collection Value</p>
                  <p className="mt-1 font-bold text-slate-900">
                    ₹{savedCollection.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <MilkCollectionWhatsAppButton
                  collectionId={savedCollectionId}
                />
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/admin/production/collections"
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  View Milk Collections
                </Link>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  Record Another Collection
                </button>
              </div>
            </div>
          </section>
        ) : null}

{!savedCollectionId ? (
        <form
          onSubmit={handleSubmit}
          className="mt-5 space-y-5"
        >
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <SectionHeading
              title="Collection Details"
              description="Identify the supplier and type of milk received."
            />

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Field label="Farmer / Supplier" required>
                <select
                  value={form.supplierId}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      supplierId: e.target.value,
                    }))
                  }
                  className={inputClass}
                  required
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option
                      key={supplier.id}
                      value={supplier.id}
                    >
                      {supplier.name} ({supplier.supplier_code})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Milk Type" required>
                <select
                  value={form.milkType}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      milkType: e.target.value,
                    }))
                  }
                  className={inputClass}
                  required
                >
                  <option value="cow">Cow</option>
                  <option value="buffalo">Buffalo</option>
                </select>
              </Field>

              <Field
                label="Collection Center"
                hint="Optional"
              >
                <input
                  value={form.collectionCenter}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      collectionCenter: e.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="Enter collection center"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <SectionHeading
              title="Quantity & Rate"
              description="Enter quantity, then FAT and SNF. The applicable rate is fetched automatically from the active Rate Chart."
            />

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <NumberField
                label="Quantity"
                suffix="litres"
                value={form.quantityLitres}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    quantityLitres: value,
                  }))
                }
                required
              />

              <div>
                <Field
                  label="Rate per Litre"
                  hint="Automatic"
                  required
                >
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                      ₹
                    </span>

                    <input
                      type="text"
                      value={
                        rateLoading
                          ? 'Checking…'
                          : form.ratePerLitre
                            ? `₹${form.ratePerLitre}`
                            : ''
                      }
                      readOnly
                      aria-readonly="true"
                      placeholder="Enter FAT + SNF"
                      className={`${inputClass} bg-slate-50 pl-9 font-semibold ${
                        form.ratePerLitre
                          ? 'border-emerald-200 text-emerald-800'
                          : 'text-slate-500'
                      }`}
                    />
                  </div>
                </Field>

                <p
                  className={`mt-2 text-xs leading-5 ${
                    rateMessage?.startsWith('Rate matched')
                      ? 'text-emerald-700'
                      : 'text-slate-500'
                  }`}
                  role="status"
                >
                  {rateMessage}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Estimated collection value
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Quantity × Rate Chart rate
                  </p>
                </div>
                <p className="text-2xl font-bold text-slate-950">
                  ₹{estimatedTotal.toFixed(2)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <SectionHeading
              title="Quality Information"
              description="FAT and SNF determine the automatic collection rate. Temperature is optional."
            />

            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              <NumberField
                label="Fat"
                suffix="%"
                value={form.fatPercent}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    fatPercent: value,
                  }))
                }
                required
              />

              <NumberField
                label="SNF"
                suffix="%"
                value={form.snfPercent}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    snfPercent: value,
                  }))
                }
                required
              />

              <NumberField
                label="Temperature"
                suffix="°C"
                value={form.temperature}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    temperature: value,
                  }))
                }
              />
            </div>

            <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-sm leading-6 text-sky-900">
                <strong>Automatic Rate:</strong> The displayed rate comes from
                the active Rate Chart for the selected milk type, FAT and SNF.
                The server checks the Rate Chart again when you save.
              </p>
            </div>

            <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <span className="text-lg">⚠️</span>
              <p className="text-sm leading-6 text-amber-900">
                New collections start on <strong>Hold</strong> until they
                are cleared through Quality Control.
              </p>
            </div>
          </section>

          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium leading-6 text-red-700"
            >
              {error}
            </div>
          )}

          <div className="sticky bottom-3 z-10 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/admin/production/collections"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.99]"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={
                  saving ||
                  rateLoading ||
                  suppliers.length === 0 ||
                  !form.ratePerLitre
                }
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-red-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Record Collection'}
              </button>
            </div>
          </div>
        </form>
        ) : null}
      </div>
    </main>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-950">
        {title}
      </h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  hint,
  required = false,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
        {label}
        {required && (
          <span className="text-red-600">*</span>
        )}
        {hint && (
          <span className="font-normal text-slate-400">
            ({hint})
          </span>
        )}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
  required?: boolean;
}) {
  return (
    <Field label={label} required={required}>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
            {prefix}
          </span>
        )}

        <input
          type="number"
          step="0.01"
          min="0"
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          className={`${inputClass} ${
            prefix ? 'pl-9' : ''
          } ${suffix ? 'pr-16' : ''}`}
        />

        {suffix && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
}

const inputClass =
  'min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-50';