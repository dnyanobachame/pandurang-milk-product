'use client';

import { useState } from 'react';
import { createSupplier } from '@/app/actions/suppliers';

export default function NewSupplierPage() {
  const [form, setForm] = useState({ supplierCode: '', name: '', mobile: '', village: '', address: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await createSupplier(form);
    if (result?.error) {
      setSaving(false);
      setError(result.error);
    }
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Add Supplier</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Supplier Code" value={form.supplierCode} onChange={(v) => setForm((f) => ({ ...f, supplierCode: v }))} required />
        <Field label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
        <Field label="Mobile" value={form.mobile} onChange={(v) => setForm((f) => ({ ...f, mobile: v }))} required />
        <Field label="Village" value={form.village} onChange={(v) => setForm((f) => ({ ...f, village: v }))} required />
        <Field label="Address (optional)" value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit" disabled={saving}
          className="w-full rounded-full bg-brand-600 text-white py-2.5 font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Supplier'}
        </button>
      </form>
    </main>
  );
}

function Field({
  label, value, onChange, required = false,
}: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        value={value} required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
      />
    </label>
  );
}
