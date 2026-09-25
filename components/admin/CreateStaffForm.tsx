'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createStaffUser } from '@/app/actions/staff';
import type { AppRole } from '@/lib/roles';

const STAFF_ROLES: AppRole[] = [
  'production_manager', 'production_staff', 'quality_control',
  'packing_manager', 'packing_staff', 'inventory_manager',
  'sales_manager', 'accountant', 'customer_support',
  'delivery_manager', 'delivery_partner', 'admin',
];

export function CreateStaffForm() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: '', email: '', mobile: '', role: STAFF_ROLES[0] as AppRole, vehicleNumber: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await createStaffUser({
      fullName: form.fullName, email: form.email, mobile: form.mobile || undefined,
      role: form.role, vehicleNumber: form.role === 'delivery_partner' ? form.vehicleNumber : undefined,
    });
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setCreated({ email: result.email!, tempPassword: result.tempPassword! });
    setForm({ fullName: '', email: '', mobile: '', role: STAFF_ROLES[0], vehicleNumber: '' });
    router.refresh();
  }

  if (created) {
    return (
      <div className="rounded-xl2 border border-brand-200 bg-brand-50 p-4 text-sm">
        <p className="font-medium text-brand-700">Account created</p>
        <p className="mt-1">
          Email: <span className="font-mono">{created.email}</span><br />
          Temporary password: <span className="font-mono">{created.tempPassword}</span>
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Share this password securely with the staff member — it won&apos;t be shown again.
          There&apos;s no self-service password reset yet, so if it&apos;s lost, delete and recreate
          the account in Supabase Auth directly.
        </p>
        <button onClick={() => setCreated(null)} className="mt-3 text-xs text-brand-700 font-medium">
          + Add another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl2 border border-gray-100 bg-white p-4 space-y-3">
      <h2 className="font-medium text-sm">Add Staff Member</h2>
      <div className="grid grid-cols-2 gap-3">
        <input required placeholder="Full name" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <input placeholder="Mobile (optional)" value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AppRole }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          {STAFF_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>
        {form.role === 'delivery_partner' && (
          <input placeholder="Vehicle number" value={form.vehicleNumber} onChange={(e) => setForm((f) => ({ ...f, vehicleNumber: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm col-span-2" />
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={saving} className="rounded-full bg-brand-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-60">
        {saving ? 'Creating…' : 'Create Account'}
      </button>
    </form>
  );
}
