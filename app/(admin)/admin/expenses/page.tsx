import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ApproveExpenseButton } from '@/components/expenses/ApproveExpenseButton';

export const dynamic = 'force-dynamic';

type ExpenseCategory = {
  name: string;
};

type Expense = {
  id: string;
  name: string;
  amount: number | string | null;
  expense_date: string | null;
  vendor: string | null;
  payment_method: string | null;
  approved_by: string | null;
  expense_categories: ExpenseCategory[] | ExpenseCategory | null;
};

type Filter = 'all' | 'approved' | 'pending';

function getCategoryName(
  category: Expense['expense_categories'],
): string {
  if (Array.isArray(category)) {
    return category[0]?.name ?? '—';
  }

  return category?.name ?? '—';
}

function formatCurrency(value: number | string | null): string {
  return `₹${Number(value ?? 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null): string {
  if (!value) return '—';

  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getPaymentLabel(value: string | null): string {
  switch (value) {
    case 'cash':
      return 'Cash';
    case 'upi':
      return 'UPI';
    case 'bank_transfer':
      return 'Bank Transfer';
    case 'cheque':
      return 'Cheque';
    default:
      return value || '—';
  }
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const supabase = createClient();

  const selectedFilter: Filter =
    searchParams?.status === 'approved' || searchParams?.status === 'pending'
      ? searchParams.status
      : 'all';

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select(
      'id, name, amount, expense_date, vendor, payment_method, approved_by, expense_categories(name)',
    )
    .order('expense_date', { ascending: false })
    .limit(50);

  const allExpenses = (expenses ?? []) as Expense[];

  const approvedCount = allExpenses.filter(
    (expense) => Boolean(expense.approved_by),
  ).length;

  const pendingCount = allExpenses.length - approvedCount;

  const total = allExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount ?? 0),
    0,
  );

  const visibleExpenses = allExpenses.filter((expense) => {
    if (selectedFilter === 'approved') return Boolean(expense.approved_by);
    if (selectedFilter === 'pending') return !expense.approved_by;
    return true;
  });

  const filterLinks: Array<{
    key: Filter;
    label: string;
    value: string;
    helper: string;
  }> = [
    {
      key: 'all',
      label: 'Total Expenses',
      value: formatCurrency(total),
      helper: 'Last 50 entries',
    },
    {
      key: 'approved',
      label: 'Approved',
      value: String(approvedCount),
      helper: `${approvedCount} approved entries`,
    },
    {
      key: 'pending',
      label: 'Pending Approval',
      value: String(pendingCount),
      helper: 'Expenses awaiting review',
    },
  ];

  return (
    <div className="w-full">
      <div className="mb-6">
        <Link
          href="/admin/expenses"
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <span className="mr-2">←</span>
          Back
        </Link>
      </div>

      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Finance
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            Expenses
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track business expenses, payment methods, vendors, and approval
            status.
          </p>
        </div>

        <Link
          href="/admin/expenses/new"
          className="inline-flex items-center justify-center rounded-xl bg-green-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800"
        >
          <span className="mr-2 text-base">+</span>
          Add Expense
        </Link>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Unable to load expenses. Please refresh and try again.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {filterLinks.map((card) => {
          const isSelected = selectedFilter === card.key;

          return (
            <Link
              key={card.key}
              href={
                card.key === 'all'
                  ? '/admin/expenses'
                  : `/admin/expenses?status=${card.key}`
              }
              aria-current={isSelected ? 'page' : undefined}
              className={[
                'group rounded-2xl border bg-white p-5 shadow-sm transition',
                'focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2',
                isSelected
                  ? 'border-green-600 ring-2 ring-green-100'
                  : 'border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-600">
                  {card.label}
                </p>
                <span
                  className={[
                    'rounded-lg px-2 py-1 text-xs font-semibold',
                    isSelected
                      ? 'bg-green-50 text-green-700'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200',
                  ].join(' ')}
                >
                  {isSelected ? 'Selected' : 'View'}
                </span>
              </div>

              <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                {card.value}
              </p>

              <p className="mt-1 text-xs text-slate-400">{card.helper}</p>
            </Link>
          );
        })}
      </div>

      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Recent expenses
            </h2>
            <p className="text-sm text-slate-500">
              {selectedFilter === 'all'
                ? 'Showing up to the latest 50 expense entries.'
                : selectedFilter === 'approved'
                  ? 'Showing approved expense entries.'
                  : 'Showing expenses awaiting approval.'}
            </p>
          </div>

          <span className="text-sm font-medium text-slate-400">
            {visibleExpenses.length}{' '}
            {visibleExpenses.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {visibleExpenses.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500">
              ₹
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              {selectedFilter === 'all'
                ? 'No expenses recorded yet'
                : selectedFilter === 'approved'
                  ? 'No approved expenses'
                  : 'No pending expenses'}
            </h3>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              {selectedFilter === 'all'
                ? 'Add your first expense to start tracking finance activity.'
                : 'Try another expense filter or add a new expense.'}
            </p>

            {selectedFilter === 'all' ? (
              <Link
                href="/admin/expenses/new"
                className="mt-5 inline-flex items-center rounded-xl bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800"
              >
                Add Expense
              </Link>
            ) : (
              <Link
                href="/admin/expenses"
                className="mt-5 inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                View All Expenses
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Expense
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Category
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Vendor
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Payment
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Amount
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {visibleExpenses.map((expense) => {
                  const approved = Boolean(expense.approved_by);

                  return (
                    <tr key={expense.id} className="hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {formatDate(expense.expense_date)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900">
                          {expense.name}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {getCategoryName(expense.expense_categories)}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {expense.vendor || '—'}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {getPaymentLabel(expense.payment_method)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-900">
                        {formatCurrency(expense.amount)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {approved ? (
                          <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                            Approved
                          </span>
                        ) : (
                          <ApproveExpenseButton expenseId={expense.id} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
