'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { updateSupplier } from '@/app/actions/suppliers';

type Supplier = {
  id: string; supplier_code: string; name: string; mobile: string | null;
  village: string | null; address: string | null; is_active: boolean;
  outstanding_balance: number | null;
};

export default function SupplierDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ supplierCode: '', name: '', mobile: '', village: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data, error: loadError } = await supabase.from('suppliers')
        .select('id, supplier_code, name, mobile, village, address, is_active, outstanding_balance')
        .eq('id', params.id).single();
      if (loadError || !data) { setError('Supplier could not be found.'); setLoading(false); return; }
      const row = data as Supplier;
      setSupplier(row);
      setForm({ supplierCode: row.supplier_code ?? '', name: row.name ?? '', mobile: row.mobile ?? '', village: row.village ?? '', address: row.address ?? '' });
      setLoading(false);
    };
    void load();
  }, [params.id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null);
    const result = await updateSupplier(params.id, form);
    if (result?.error) { setSaving(false); setError(result.error); return; }
    router.push('/admin/suppliers'); router.refresh();
  }

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">Loading supplier…</div>;
  if (!supplier) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error || 'Supplier not found.'}</div>;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/admin/suppliers" className="text-sm font-semibold text-slate-500 hover:text-slate-900">← Suppliers / Farmers</Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Edit Supplier</h1>
          <p className="mt-1 text-sm text-slate-500">Update farmer or supplier master information.</p>
        </div>
        <span className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${supplier.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{supplier.is_active ? 'Active' : 'Inactive'}</span>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Supplier Code" value={form.supplierCode} required onChange={(value) => setForm((c) => ({ ...c, supplierCode: value }))} />
          <Field label="Farmer / Supplier Name" value={form.name} required onChange={(value) => setForm((c) => ({ ...c, name: value }))} />
          <Field label="Mobile Number" value={form.mobile} required inputMode="tel" onChange={(value) => setForm((c) => ({ ...c, mobile: value }))} />
          <Field label="Village" value={form.village} required onChange={(value) => setForm((c) => ({ ...c, village: value }))} />
          <div className="md:col-span-2"><Field label="Address" value={form.address} onChange={(value) => setForm((c) => ({ ...c, address: value }))} /></div>
        </div>
        {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link href="/admin/suppliers" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</Link>
          <button type="submit" disabled={saving} className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </form>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Outstanding Balance</p><p className="mt-2 text-2xl font-bold text-slate-900">₹{Number(supplier.outstanding_balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supplier ID</p><p className="mt-2 break-all text-sm font-medium text-slate-700">{supplier.id}</p></div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, required, inputMode }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; inputMode?: 'tel' | 'text' }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label}{required ? <span className="text-red-500"> *</span> : null}</span><input value={value} onChange={(e) => onChange(e.target.value)} required={required} inputMode={inputMode} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200" /></label>;
}
