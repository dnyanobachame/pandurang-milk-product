'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '', mobile: '', email: '', password: '',
    addressLine: '', villageCity: '', taluka: '', district: 'Latur',
    pinCode: '', deliveryInstructions: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName, mobile: form.mobile } },
    });

    if (signUpError || !signUpData.user) {
      setLoading(false);
      setError('Could not create your account. The email may already be registered.');
      return;
    }

    // Profile row is created by a DB trigger (see supabase/04_auth_trigger.sql)
    // reading raw_user_meta_data. We just attach the first address here.
    const { error: addressError } = await supabase.from('customer_addresses').insert({
      customer_id: signUpData.user.id,
      address_line: form.addressLine,
      village_city: form.villageCity,
      taluka: form.taluka || null,
      district: form.district,
      pin_code: form.pinCode,
      delivery_instructions: form.deliveryInstructions || null,
      is_default: true,
    });

    setLoading(false);

    if (addressError) {
      // Account exists but address save failed — let them add it from the
      // dashboard rather than blocking signup entirely.
      router.push('/dashboard/addresses?setup=1');
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-cream-50 px-6 py-12 flex justify-center">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-lg bg-white rounded-xl2 shadow-sm border border-gray-100 p-8"
      >
        <h1 className="text-xl font-semibold text-brand-700 mb-1">Create your account</h1>
        <p className="text-sm text-gray-500 mb-6">Order fresh milk and dairy, delivered to your door</p>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name" value={form.fullName} onChange={(v) => update('fullName', v)} required span2 />
          <Field label="Mobile Number" value={form.mobile} onChange={(v) => update('mobile', v)} required />
          <Field label="Email" type="email" value={form.email} onChange={(v) => update('email', v)} required />
          <Field label="Password" type="password" value={form.password} onChange={(v) => update('password', v)} required span2 />

          <Field label="Address" value={form.addressLine} onChange={(v) => update('addressLine', v)} required span2 />
          <Field label="Village / City" value={form.villageCity} onChange={(v) => update('villageCity', v)} required />
          <Field label="Taluka" value={form.taluka} onChange={(v) => update('taluka', v)} />
          <Field label="District" value={form.district} onChange={(v) => update('district', v)} required />
          <Field label="PIN Code" value={form.pinCode} onChange={(v) => update('pinCode', v)} required />
          <Field
            label="Delivery Instructions (optional)"
            value={form.deliveryInstructions}
            onChange={(v) => update('deliveryInstructions', v)}
            span2
          />
        </div>

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 rounded-full bg-brand-600 text-white py-2.5 font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>

        <p className="text-sm text-gray-500 mt-4 text-center">
          Already have an account? <a href="/auth/login" className="text-brand-700 font-medium">Sign in</a>
        </p>
      </form>
    </main>
  );
}

function Field({
  label, value, onChange, type = 'text', required = false, span2 = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; span2?: boolean;
}) {
  return (
    <label className={`block text-sm font-medium ${span2 ? 'col-span-2' : ''}`}>
      {label}
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
      />
    </label>
  );
}
