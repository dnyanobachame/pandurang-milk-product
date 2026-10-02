'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createSupplier } from '@/app/actions/suppliers';

type SupplierForm = {
  supplierCode: string;
  name: string;
  mobile: string;
  village: string;
  address: string;
};

export default function NewSupplierPage() {
  const [form, setForm] = useState<SupplierForm>({
    supplierCode: '',
    name: '',
    mobile: '',
    village: '',
    address: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateField(field: keyof SupplierForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const supplierCode = form.supplierCode.trim();
    const name = form.name.trim();
    const mobile = form.mobile.trim();
    const village = form.village.trim();
    const address = form.address.trim();

    if (!supplierCode || !name || !mobile || !village) {
      setError('Please complete all required fields.');
      return;
    }

    setSaving(true);

    try {
      const result = await createSupplier({
        supplierCode,
        name,
        mobile,
        village,
        address,
      });

      if (result?.error) {
        setError(result.error);
        setSaving(false);
      }
    } catch {
      setError('Unable to save supplier. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <Link
          href="/admin/suppliers"
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <span className="mr-2">←</span>
          Back to Suppliers
        </Link>
      </div>

      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Procurement
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
          Add Supplier
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a supplier or farmer record for milk procurement.
        </p>
      </div>

      <section className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Supplier Details
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Fields marked with * are required.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Supplier Code"
              value={form.supplierCode}
              onChange={(value) => updateField('supplierCode', value)}
              required
              placeholder="SUP-001"
            />

            <Field
              label="Name"
              value={form.name}
              onChange={(value) => updateField('name', value)}
              required
              placeholder="Supplier / farmer name"
            />

            <Field
              label="Mobile"
              type="tel"
              value={form.mobile}
              onChange={(value) => updateField('mobile', value)}
              required
              placeholder="Mobile number"
            />

            <Field
              label="Village"
              value={form.village}
              onChange={(value) => updateField('village', value)}
              required
              placeholder="Village / town"
            />

            <div className="sm:col-span-2">
              <Field
                label="Address"
                value={form.address}
                onChange={(value) => updateField('address', value)}
                placeholder="Full address (optional)"
              />
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <Link
              href="/admin/suppliers"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-green-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-600 focus:ring-2 focus:ring-green-100"
      />
    </label>
  );
}
