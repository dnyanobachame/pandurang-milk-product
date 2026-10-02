import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import RateStatusButton from '@/components/admin/RateStatusButton';
import RateChartCsvImport from '@/components/admin/RateChartCsvImport';

export const dynamic = 'force-dynamic';

type RateRow = {
  id: string;
  milk_type: 'cow' | 'buffalo';
  fat_percent: number;
  snf_percent: number;
  rate_per_litre: number;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  version: number;
  created_at: string;
};

type SearchParams = {
  milk?: string;
  status?: string;
};

export default async function RateChartPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('rate_chart')
    .select(
      'id, milk_type, fat_percent, snf_percent, rate_per_litre, effective_from, effective_to, is_active, version, created_at'
    )
    .order('milk_type')
    .order('fat_percent')
    .order('snf_percent')
    .order('effective_from', { ascending: false });

  const rates = (data ?? []) as RateRow[];

  const milkFilter =
    searchParams?.milk === 'cow' ||
    searchParams?.milk === 'buffalo'
      ? searchParams.milk
      : 'all';

  const statusFilter =
    searchParams?.status === 'active' ||
    searchParams?.status === 'inactive'
      ? searchParams.status
      : 'all';

  const filteredRates = rates.filter((rate) => {
    const milkMatches =
      milkFilter === 'all' || rate.milk_type === milkFilter;

    const statusMatches =
      statusFilter === 'all' ||
      (statusFilter === 'active' && rate.is_active) ||
      (statusFilter === 'inactive' && !rate.is_active);

    return milkMatches && statusMatches;
  });

  const activeCount = rates.filter((rate) => rate.is_active).length;
  const inactiveCount = rates.filter((rate) => !rate.is_active).length;

  const latestVersion = rates.length
    ? Math.max(...rates.map((rate) => rate.version))
    : 0;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Production</p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Rate Chart
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Manage FAT + SNF based milk procurement rates used during milk
            collection.
          </p>
        </div>

        <a
          href="#rate-chart-csv"
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          + Import Rate CSV
        </a>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Unable to load the rate chart: {error.message}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Rates</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {rates.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Active</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {activeCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Inactive</p>
          <p className="mt-2 text-2xl font-bold text-slate-700">
            {inactiveCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Latest Version</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {latestVersion || '—'}
          </p>
        </div>
      </div>

      {/* CSV Import — the only rate-entry workflow */}
      <div id="rate-chart-csv">
        <RateChartCsvImport />
      </div>

      {/* Filters + Directory */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="font-semibold text-slate-900">Rate Directory</h2>
            <p className="mt-1 text-xs text-slate-500">
              {filteredRates.length} rate
              {filteredRates.length === 1 ? '' : 's'} shown
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/production/rate-chart"
              className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                milkFilter === 'all'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              All
            </Link>

            <Link
              href="/admin/production/rate-chart?milk=cow"
              className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                milkFilter === 'cow'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Cow
            </Link>

            <Link
              href="/admin/production/rate-chart?milk=buffalo"
              className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                milkFilter === 'buffalo'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Buffalo
            </Link>

            <Link
              href="/admin/production/rate-chart?status=active"
              className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                statusFilter === 'active'
                  ? 'border-emerald-700 bg-emerald-700 text-white'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Active
            </Link>

            <Link
              href="/admin/production/rate-chart?status=inactive"
              className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                statusFilter === 'inactive'
                  ? 'border-slate-700 bg-slate-700 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Inactive
            </Link>
          </div>
        </div>

        {filteredRates.length === 0 ? (
          <div className="border-t border-slate-100 px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
              ₹
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No rates configured
            </h3>

            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Upload your complete rate chart using the CSV import feature.
              Manual rate entry is disabled on this screen.
            </p>

            <a
              href="#rate-chart-csv"
              className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Import Rate CSV
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Milk</th>
                  <th className="px-5 py-3">FAT</th>
                  <th className="px-5 py-3">SNF</th>
                  <th className="px-5 py-3">Rate / L</th>
                  <th className="px-5 py-3">Effective</th>
                  <th className="px-5 py-3">Version</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredRates.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-medium capitalize text-slate-900">
                      {row.milk_type}
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {Number(row.fat_percent).toFixed(2)}%
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {Number(row.snf_percent).toFixed(2)}%
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-900">
                      ₹{Number(row.rate_per_litre).toFixed(2)}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {row.effective_from}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      v{row.version}
                    </td>

                    <td className="px-5 py-4">
                      {row.is_active ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <RateStatusButton
                        id={row.id}
                        active={row.is_active}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Information */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-800">
        <strong>Rate history:</strong> rates are deactivated instead of
        physically deleted so historical collection records can retain their
        original rate.
      </div>
    </div>
  );
}