'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { recordMilkCollection } from '@/app/actions/production';

type Supplier = { id: string; name: string; supplier_code: string };

export default function NewMilkCollectionPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState({
    supplierId: '', milkType: 'cow', quantityLitres: '', fatPercent: '',
    snfPercent: '', temperature: '', ratePerLitre: '', collectionCenter: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('suppliers').select('id, name, supplier_code').eq('is_active', true).order('name')
      .then(({ data }) => {
        setSuppliers(data ?? []);
        if (data?.[0]) setForm((f) => ({ ...f, supplierId: data[0].id }));
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.supplierId) {
      setError('Please select a supplier.');
      return;
    }
    setSaving(true);
    setError(null);
    const result = await recordMilkCollection({
      supplierId: form.supplierId,
      milkType: form.milkType,
      quantityLitres: Number(form.quantityLitres),
      fatPercent: form.fatPercent ? Number(form.fatPercent) : undefined,
      snfPercent: form.snfPercent ? Number(form.snfPercent) : undefined,
      temperature: form.temperature ? Number(form.temperature) : undefined,
      ratePerLitre: Number(form.ratePerLitre),
      collectionCenter: form.collectionCenter || undefined,
    });
    if (result?.error) {
      setSaving(false);
      setError(result.error);
    }
  }

  const estimatedTotal =
    Number(form.quantityLitres || 0) * Number(form.ratePerLitre || 0);

  return (
    <main className="max-w-lg mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Record Milk Collection</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium">
          Farmer / Supplier
          <select
            value={form.supplierId}
            onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.supplier_code})</option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Milk Type
          <select
            value={form.milkType}
            onChange={(e) => setForm((f) => ({ ...f, milkType: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
          >
            <option value="cow">Cow</option>
            <option value="buffalo">Buffalo</option>
          </select>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <NumField label="Quantity (litres)" value={form.quantityLitres} onChange={(v) => setForm((f) => ({ ...f, quantityLitres: v }))} required />
          <NumField label="Rate per litre (₹)" value={form.ratePerLitre} onChange={(v) => setForm((f) => ({ ...f, ratePerLitre: v }))} required />
          <NumField label="Fat %" value={form.fatPercent} onChange={(v) => setForm((f) => ({ ...f, fatPercent: v }))} />
          <NumField label="SNF %" value={form.snfPercent} onChange={(v) => setForm((f) => ({ ...f, snfPercent: v }))} />
          <NumField label="Temperature (°C)" value={form.temperature} onChange={(v) => setForm((f) => ({ ...f, temperature: v }))} />
        </div>

        <label className="block text-sm font-medium">
          Collection Center (optional)
          <input
            value={form.collectionCenter}
            onChange={(e) => setForm((f) => ({ ...f, collectionCenter: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
          />
        </label>

        <div className="rounded-xl2 border border-gray-100 bg-cream-50 p-3 text-sm flex justify-between">
          <span className="text-gray-500">Estimated total</span>
          <span className="font-semibold">₹{estimatedTotal.toFixed(2)}</span>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit" disabled={saving}
          className="w-full rounded-full bg-brand-600 text-white py-2.5 font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Record Collection'}
        </button>
      </form>
    </main>
  );
}

function NumField({
  label, value, onChange, required = false,
}: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        type="number" step="0.01" required={required}
        value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
      />
    </label>
  );
}
