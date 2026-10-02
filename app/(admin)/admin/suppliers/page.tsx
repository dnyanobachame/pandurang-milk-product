import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import SupplierActions from '@/components/admin/SupplierActions';

export const dynamic = 'force-dynamic';

type Supplier = {
  id: string;
  supplier_code: string;
  name: string;
  mobile: string | null;
  village: string | null;
  is_active: boolean;
  outstanding_balance: number | string | null;
};

type SearchParams = {
  q?: string;
  status?: string;
};

function formatCurrency(value: number | string | null): string {
  return `₹${Number(value ?? 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('suppliers')
    .select(
      'id, supplier_code, name, mobile, village, is_active, outstanding_balance',
    )
    .order('name');

  const suppliers = (data ?? []) as Supplier[];

  const query = (searchParams?.q ?? '').trim().toLowerCase();
  const status = searchParams?.status ?? 'all';

  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch =
      !query ||
      supplier.name.toLowerCase().includes(query) ||
      supplier.supplier_code.toLowerCase().includes(query) ||
      (supplier.mobile ?? '').toLowerCase().includes(query) ||
      (supplier.village ?? '').toLowerCase().includes(query);

    const matchesStatus =
      status === 'all' ||
      (status === 'active' && supplier.is_active) ||
      (status === 'inactive' && !supplier.is_active);

    return matchesSearch && matchesStatus;
  });

  const activeCount = suppliers.filter((supplier) => supplier.is_active).length;
  const inactiveCount = suppliers.length - activeCount;
  const outstandingTotal = suppliers.reduce(
    (sum, supplier) => sum + Number(supplier.outstanding_balance ?? 0),
    0,
  );

  return (
    <div className="w-full">
      {/* Page header */}
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Procurement
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            Suppliers / Farmers
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage milk suppliers, farmer details, status, and outstanding balances.
          </p>
        </div>

        <Link
          href="/admin/suppliers/new"
          className="inline-flex items-center justify-center rounded-xl bg-green-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800"
        >
          <span className="mr-2 text-base">+</span>
          Add Supplier
        </Link>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Unable to load suppliers. Please refresh and try again.
        </div>
      ) : null}

      {/* Summary */}
      <section className="mb-7 grid gap-4 sm:grid-cols-3">
        <Link
          href="/admin/suppliers?status=all"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
        >
          <p className="text-sm font-medium text-slate-500">Total Suppliers</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {suppliers.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">Registered suppliers / farmers</p>
        </Link>

        <Link
          href="/admin/suppliers?status=active"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
        >
          <p className="text-sm font-medium text-slate-500">Active</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {activeCount}
          </p>
          <p className="mt-1 text-xs text-slate-400">{inactiveCount} inactive</p>
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Outstanding Balance
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {formatCurrency(outstandingTotal)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Across all suppliers</p>
        </div>
      </section>

      {/* Directory */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Supplier Directory
              </h2>
              <p className="text-sm text-slate-500">
                Search, edit, activate/deactivate, or delete supplier records.
              </p>
            </div>

            <Link
              href="/admin/production/collections"
              className="text-sm font-semibold text-slate-700 hover:text-slate-950"
            >
              View Milk Collections →
            </Link>
          </div>

          {/* Search + filters */}
          <form
            method="GET"
            className="mt-4 flex flex-col gap-3 md:flex-row"
          >
            <input
              name="q"
              defaultValue={searchParams?.q ?? ''}
              placeholder="Search name, code, mobile or village..."
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />

            <select
              name="status"
              defaultValue={status}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Search
            </button>

            {query || status !== 'all' ? (
              <Link
                href="/admin/suppliers"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Clear
              </Link>
            ) : null}
          </form>
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3">
          <span className="text-xs font-medium text-slate-500">
            Showing {filteredSuppliers.length} of {suppliers.length} records
          </span>
          {query ? (
            <span className="text-xs font-medium text-slate-500">
              Search: “{searchParams?.q}”
            </span>
          ) : null}
        </div>

        {filteredSuppliers.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500">
              👤
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              {suppliers.length === 0 ? 'No suppliers yet' : 'No matching suppliers'}
            </h3>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              {suppliers.length === 0
                ? 'Add your first supplier or farmer to start building the procurement directory.'
                : 'Try another search term or clear the current filters.'}
            </p>

            {suppliers.length === 0 ? (
              <Link
                href="/admin/suppliers/new"
                className="mt-5 inline-flex items-center rounded-xl bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800"
              >
                Add Supplier
              </Link>
            ) : (
              <Link
                href="/admin/suppliers"
                className="mt-5 inline-flex items-center rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Clear Filters
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Code
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Name
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Mobile
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Village
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Outstanding
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-700">
                        {supplier.supplier_code}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/suppliers/${supplier.id}`}
                        className="font-medium text-slate-900 hover:text-green-700 hover:underline"
                      >
                        {supplier.name}
                      </Link>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {supplier.mobile || '—'}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {supplier.village || '—'}
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">
                      {formatCurrency(supplier.outstanding_balance)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <span
                        className={[
                          'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                          supplier.is_active
                            ? 'bg-green-50 text-green-700'
                            : 'bg-slate-100 text-slate-500',
                        ].join(' ')}
                      >
                        {supplier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/suppliers/${supplier.id}`}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit
                        </Link>

                        <SupplierActions
                          supplierId={supplier.id}
                          isActive={supplier.is_active}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Management note */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <p className="text-sm font-semibold text-amber-900">
          Supplier data protection
        </p>
        <p className="mt-1 text-sm leading-6 text-amber-800">
          Suppliers with milk collection history are protected from permanent
          deletion. Deactivate them when they stop supplying milk so historical
          collection and payment records remain intact.
        </p>
      </div>
    </div>
  );
}
