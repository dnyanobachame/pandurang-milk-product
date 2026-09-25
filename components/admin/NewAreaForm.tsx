'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDeliveryArea } from '@/app/actions/delivery-areas';

export function NewAreaForm() {
  const router = useRouter();
  const [form, setForm] = useState({ cityOrVillage: '', pinCode: '', deliveryFee: '30', freeDeliveryAbove: '', minOrderAmount: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await createDeliveryArea({
      cityOrVillage: form.cityOrVillage,
      pinCode: form.pinCode || undefined,
      deliveryFee: Number(form.deliveryFee),
      freeDeliveryAbove: form.freeDeliveryAbove ? Number(form.freeDeliveryAbove) : undefined,
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
    });
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setForm({ cityOrVillage: '', pinCode: '', deliveryFee: '30', freeDeliveryAbove: '', minOrderAmount: '' });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl2 border border-gray-100 bg-white p-4 space-y-3">
      <h2 className="font-medium text-sm">Add New Area</h2>
      <div className="grid grid-cols-2 gap-3">
        <input required placeholder="Village / City" value={form.cityOrVillage} onChange={(e) => setForm((f) => ({ ...f, cityOrVillage: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <input placeholder="PIN Code" value={form.pinCode} onChange={(e) => setForm((f) => ({ ...f, pinCode: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <input type="number" placeholder="Delivery fee (₹)" value={form.deliveryFee} onChange={(e) => setForm((f) => ({ ...f, deliveryFee: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <input type="number" placeholder="Free above (₹, optional)" value={form.freeDeliveryAbove} onChange={(e) => setForm((f) => ({ ...f, freeDeliveryAbove: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={saving} className="rounded-full bg-brand-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-60">
        {saving ? 'Adding…' : 'Add Area'}
      </button>
    </form>
  );
}
