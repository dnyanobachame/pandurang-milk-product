'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createExpense } from '@/app/actions/expenses';

type Category = { id: string; name: string };

export default function NewExpensePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    categoryId: '', name: '', amount: '', expenseDate: new Date().toISOString().slice(0, 10),
    vendor: '', paymentMethod: 'cash', notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('expense_categories').select('id, name').order('name').then(({ data }) => {
      setCategories(data ?? []);
      if (data?.[0]) setForm((f) => ({ ...f, categoryId: data[0].id }));
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await createExpense({
      categoryId: form.categoryId,
      name: form.name,
      amount: Number(form.amount),
      expenseDate: form.expenseDate,
      vendor: form.vendor || undefined,
      paymentMethod: form.paymentMethod || undefined,
      notes: form.notes || undefined,
    });
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.push('/admin/expenses');
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Add Expense</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium">
          Category
          <select
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
          >
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Expense Name
          <input
            required value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm font-medium">
            Amount (₹)
            <input
              type="number" step="0.01" required value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
            />
          </label>
          <label className="block text-sm font-medium">
            Date
            <input
              type="date" required value={form.expenseDate}
              onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
            />
          </label>
        </div>

        <label className="block text-sm font-medium">
          Vendor (optional)
          <input
            value={form.vendor}
            onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
          />
        </label>

        <label className="block text-sm font-medium">
          Payment Method
          <select
            value={form.paymentMethod}
            onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
          </select>
        </label>

        <label className="block text-sm font-medium">
          Notes (optional)
          <textarea
            value={form.notes} rows={2}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit" disabled={saving}
          className="w-full rounded-full bg-brand-600 text-white py-2.5 font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Expense'}
        </button>
      </form>
    </main>
  );
}
