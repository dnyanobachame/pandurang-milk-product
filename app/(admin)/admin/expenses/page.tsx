import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ApproveExpenseButton } from '@/components/expenses/ApproveExpenseButton';

export default async function ExpensesPage() {
  const supabase = createClient();

  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, name, amount, expense_date, vendor, payment_method, approved_by, expense_categories(name)')
    .order('expense_date', { ascending: false })
    .limit(50);

  const total = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Expenses</h1>
        <Link href="/admin/expenses/new" className="text-sm rounded-full bg-brand-600 text-white px-4 py-2">
          + Add Expense
        </Link>
      </div>

      <div className="rounded-xl2 border border-gray-100 bg-white p-4 mb-6 text-sm flex justify-between">
        <span className="text-gray-500">Total (last 50 entries)</span>
        <span className="font-semibold">₹{total.toLocaleString('en-IN')}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Vendor</th>
              <th className="py-2 pr-4">Amount</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {(expenses ?? []).map((e: any) => (
              <tr key={e.id} className="border-b border-gray-50">
                <td className="py-2 pr-4">{e.expense_date}</td>
                <td className="py-2 pr-4">{e.name}</td>
                <td className="py-2 pr-4">{e.expense_categories?.name ?? '—'}</td>
                <td className="py-2 pr-4">{e.vendor ?? '—'}</td>
                <td className="py-2 pr-4">₹{e.amount}</td>
                <td className="py-2 pr-4">
                  {e.approved_by ? (
                    <span className="text-xs text-brand-700">Approved</span>
                  ) : (
                    <ApproveExpenseButton expenseId={e.id} />
                  )}
                </td>
              </tr>
            ))}
            {(!expenses || expenses.length === 0) && (
              <tr><td colSpan={6} className="py-6 text-gray-500 text-center">No expenses recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
