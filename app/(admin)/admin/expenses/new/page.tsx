'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createExpense } from '@/app/actions/expenses';

type Category = {
  id: string;
  name: string;
};

type ExpenseFormState = {
  categoryId: string;
  name: string;
  amount: string;
  expenseDate: string;
  vendor: string;
  paymentMethod: string;
  notes: string;
};

export default function NewExpensePage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ExpenseFormState>({
    categoryId: '',
    name: '',
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    vendor: '',
    paymentMethod: 'cash',
    notes: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from('expense_categories')
      .select('id, name')
      .order('name')
      .then(({ data, error: categoryError }) => {
        setCategories(data ?? []);

        if (data?.[0]) {
          setForm((current) => ({
            ...current,
            categoryId: data[0].id,
          }));
        }

        if (categoryError) {
          setError('Could not load expense categories.');
        }

        setLoadingCategories(false);
      });
  }, []);

  function updateField(
    field: keyof ExpenseFormState,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError(null);
  }

  function validateForm(): string | null {
    if (!form.categoryId) {
      return 'Please select an expense category.';
    }

    if (!form.name.trim()) {
      return 'Please enter an expense name.';
    }

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return 'Please enter a valid expense amount.';
    }

    if (!form.expenseDate) {
      return 'Please select an expense date.';
    }

    return null;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (saving) return;

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setShowConfirmation(true);
  }

  function handleCancelConfirmation() {
    if (saving) return;

    setShowConfirmation(false);
    setError(null);
  }

  async function handleConfirmSave() {
    if (saving) return;

    const validationError = validateForm();

    if (validationError) {
      setShowConfirmation(false);
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await createExpense({
        categoryId: form.categoryId,
        name: form.name.trim(),
        amount: Number(form.amount),
        expenseDate: form.expenseDate,
        vendor: form.vendor.trim() || undefined,
        paymentMethod: form.paymentMethod || undefined,
        notes: form.notes.trim() || undefined,
      });

      if (result?.error) {
        setError(result.error);
        setShowConfirmation(false);
        return;
      }

      router.push('/admin/expenses');
      router.refresh();
    } catch (err) {
      console.error('Expense creation failed:', err);
      setError('Unable to save this expense. Please try again.');
      setShowConfirmation(false);
    } finally {
      setSaving(false);
    }
  }

  const selectedCategory = categories.find(
    (category) => category.id === form.categoryId
  );

  return (
    <div className="w-full">
      <section className="mb-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Finance / Expenses
            </p>

            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Add Expense
            </h1>

            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
              Record a business expense for approval and financial tracking.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push('/admin/expenses')}
            disabled={saving}
            className="inline-flex min-h-[48px] touch-manipulation items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← Back to Expenses
          </button>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 className="text-sm font-bold text-slate-900">
            Expense details
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Enter the details exactly as they appear in your expense record.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 px-5 py-6 sm:px-6"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Category */}
            <div>
              <label
                htmlFor="expense-category"
                className="text-sm font-bold text-slate-700"
              >
                Category
              </label>

              <select
                id="expense-category"
                required
                value={form.categoryId}
                disabled={loadingCategories || saving}
                onChange={(e) =>
                  updateField('categoryId', e.target.value)
                }
                className="mt-2 min-h-[48px] w-full touch-manipulation rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
              >
                {loadingCategories ? (
                  <option value="">Loading categories…</option>
                ) : (
                  <>
                    <option value="">Select category</option>

                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Expense Name */}
            <div>
              <label
                htmlFor="expense-name"
                className="text-sm font-bold text-slate-700"
              >
                Expense Name
              </label>

              <input
                id="expense-name"
                type="text"
                required
                autoComplete="off"
                value={form.name}
                disabled={saving}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. Milk collection transport"
                className="mt-2 min-h-[48px] w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>

            {/* Amount */}
            <div>
              <label
                htmlFor="expense-amount"
                className="text-sm font-bold text-slate-700"
              >
                Amount (₹)
              </label>

              <input
                id="expense-amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                required
                value={form.amount}
                disabled={saving}
                onChange={(e) =>
                  updateField('amount', e.target.value)
                }
                placeholder="0.00"
                className="mt-2 min-h-[48px] w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>

            {/* Expense Date */}
            <div>
              <label
                htmlFor="expense-date"
                className="text-sm font-bold text-slate-700"
              >
                Expense Date
              </label>

              <input
                id="expense-date"
                type="date"
                required
                value={form.expenseDate}
                disabled={saving}
                onChange={(e) =>
                  updateField('expenseDate', e.target.value)
                }
                className="mt-2 min-h-[48px] w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>

            {/* Vendor */}
            <div className="sm:col-span-2">
              <label
                htmlFor="expense-vendor"
                className="text-sm font-bold text-slate-700"
              >
                Vendor
                <span className="ml-1 text-xs font-normal text-slate-400">
                  Optional
                </span>
              </label>

              <input
                id="expense-vendor"
                type="text"
                autoComplete="organization"
                value={form.vendor}
                disabled={saving}
                onChange={(e) =>
                  updateField('vendor', e.target.value)
                }
                placeholder="Vendor or supplier name"
                className="mt-2 min-h-[48px] w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>

            {/* Payment Method */}
            <div className="sm:col-span-2">
              <label
                htmlFor="expense-payment-method"
                className="text-sm font-bold text-slate-700"
              >
                Payment Method
              </label>

              <select
                id="expense-payment-method"
                value={form.paymentMethod}
                disabled={saving}
                onChange={(e) =>
                  updateField('paymentMethod', e.target.value)
                }
                className="mt-2 min-h-[48px] w-full touch-manipulation rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label
                htmlFor="expense-notes"
                className="text-sm font-bold text-slate-700"
              >
                Notes
                <span className="ml-1 text-xs font-normal text-slate-400">
                  Optional
                </span>
              </label>

              <textarea
                id="expense-notes"
                value={form.notes}
                rows={4}
                disabled={saving}
                onChange={(e) =>
                  updateField('notes', e.target.value)
                }
                placeholder="Add any additional information..."
                className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-5 text-red-700"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => router.push('/admin/expenses')}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || loadingCategories || !categories.length}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Expense'}
            </button>
          </div>
        </form>
      </section>

      {/* Confirmation */}
      {showConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="expense-confirmation-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <h2
              id="expense-confirmation-title"
              className="text-lg font-bold text-slate-950"
            >
              Confirm expense
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Review the expense details before saving.
            </p>

            <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs font-medium text-slate-500">
                  Category
                </span>

                <span className="text-right text-sm font-semibold text-slate-900">
                  {selectedCategory?.name ?? '—'}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-xs font-medium text-slate-500">
                  Expense
                </span>

                <span className="max-w-[65%] text-right text-sm font-semibold text-slate-900">
                  {form.name.trim() || '—'}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-xs font-medium text-slate-500">
                  Amount
                </span>

                <span className="text-sm font-bold text-slate-900">
                  ₹{Number(form.amount || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-xs font-medium text-slate-500">
                  Date
                </span>

                <span className="text-sm font-medium text-slate-900">
                  {form.expenseDate}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-xs font-medium text-slate-500">
                  Payment
                </span>

                <span className="text-sm font-medium capitalize text-slate-900">
                  {form.paymentMethod.replaceAll('_', ' ')}
                </span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleCancelConfirmation}
                disabled={saving}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Go Back
              </button>

              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={saving}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}