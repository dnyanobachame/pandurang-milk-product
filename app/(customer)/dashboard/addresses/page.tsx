'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CustomerAddress } from '@/lib/types';

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [form, setForm] = useState({
    addressLine: '', villageCity: '', taluka: '', district: 'Latur', pinCode: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('customer_addresses').select('*').eq('customer_id', user.id);
    setAddresses(data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('customer_addresses').insert({
      customer_id: user.id,
      address_line: form.addressLine,
      village_city: form.villageCity,
      taluka: form.taluka || null,
      district: form.district,
      pin_code: form.pinCode,
      is_default: addresses.length === 0,
    });

    setSaving(false);
    if (error) {
      setError('Could not save this address. Please try again.');
      return;
    }
    setForm({ addressLine: '', villageCity: '', taluka: '', district: 'Latur', pinCode: '' });
    load();
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Delivery Addresses</h1>

      <div className="space-y-3 mb-8">
        {addresses.map((a) => (
          <div key={a.id} className="rounded-xl2 border border-gray-100 bg-white p-4 text-sm">
            {a.address_line}, {a.village_city}, {a.district} — {a.pin_code}
            {a.is_default && <span className="ml-2 text-xs text-brand-700">(Default)</span>}
          </div>
        ))}
        {addresses.length === 0 && <p className="text-gray-500 text-sm">No addresses saved yet.</p>}
      </div>

      <form onSubmit={handleAdd} className="space-y-3">
        <h2 className="font-medium">Add New Address</h2>
        <Field label="Address" value={form.addressLine} onChange={(v) => setForm((f) => ({ ...f, addressLine: v }))} />
        <Field label="Village / City" value={form.villageCity} onChange={(v) => setForm((f) => ({ ...f, villageCity: v }))} />
        <Field label="Taluka (optional)" value={form.taluka} onChange={(v) => setForm((f) => ({ ...f, taluka: v }))} />
        <Field label="District" value={form.district} onChange={(v) => setForm((f) => ({ ...f, district: v }))} />
        <Field label="PIN Code" value={form.pinCode} onChange={(v) => setForm((f) => ({ ...f, pinCode: v }))} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-brand-600 text-white py-2.5 font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Address'}
        </button>
      </form>
    </main>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
      />
    </label>
  );
}
