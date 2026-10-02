import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function MilkCollectionsPage() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: collections, error } = await supabase
    .from('milk_collections')
    .select(
      'id, collection_date, milk_type, quantity_litres, fat_percent, rate_per_litre, total_amount, quality_status, suppliers(name, supplier_code)'
    )
    .gte('collection_date', today)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load milk collections: ${error.message}`);
  }

  const rows = collections ?? [];

  const totalLitres = rows.reduce(
    (sum, collection) => sum + Number(collection.quantity_litres ?? 0),
    0
  );

  const totalAmount = rows.reduce(
    (sum, collection) => sum + Number(collection.total_amount ?? 0),
    0
  );

  const passedCount = rows.filter(
    (collection) => collection.quality_status === 'passed'
  ).length;

  const holdCount = rows.filter(
    (collection) => collection.quality_status === 'hold'
  ).length;

  return (
    <main className="min-w-0 bg-slate-50 px-4 py-5 pb-8 md:px-8 md:py-7">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/admin/production"
                  className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 active:scale-[0.99]"
                >
                  ← Production
                </Link>
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                  Daily Operations
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                Milk Collection
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
                Record and review today&apos;s milk received from farmers and suppliers.
              </p>
            </div>

            <Link
              href="/admin/production/collections/new"
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.99] sm:w-auto"
            >
              + Record Collection
            </Link>
          </div>
        </header>

        <section
          aria-label="Milk collection statistics"
          className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          <StatCard
            label="Collections"
            value={rows.length.toLocaleString()}
            hint="Recorded today"
            href="#collection-list"
          />
          <StatCard
            label="Milk Received"
            value={`${totalLitres.toFixed(2)} L`}
            hint="Total quantity today"
            href="#collection-list"
          />
          <StatCard
            label="Collection Value"
            value={`₹${totalAmount.toFixed(2)}`}
            hint="Total recorded amount"
            href="#collection-list"
          />
          <StatCard
            label="Quality Review"
            value={`${passedCount} passed`}
            hint={`${holdCount} on hold`}
            href="/admin/production/quality"
          />
        </section>

        <section
          id="collection-list"
          className="mt-5 scroll-mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between md:p-5">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Today&apos;s Collections
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Latest collection entries appear first.
              </p>
            </div>

            <Link
              href="/admin/production/quality"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.99]"
            >
              Quality Control →
            </Link>
          </div>

          {rows.length > 0 ? (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">Farmer</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Qty</th>
                      <th className="px-5 py-3">Fat</th>
                      <th className="px-5 py-3">Rate</th>
                      <th className="px-5 py-3">Total</th>
                      <th className="px-5 py-3">Quality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((collection: any) => (
                      <tr
                        key={collection.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">
                            {collection.suppliers?.name ?? 'Unknown supplier'}
                          </div>
                          {collection.suppliers?.supplier_code && (
                            <div className="mt-1 text-xs text-slate-500">
                              {collection.suppliers.supplier_code}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 capitalize text-slate-700">
                          {collection.milk_type}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {collection.quantity_litres} L
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {collection.fat_percent ?? '—'}%
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          ₹{Number(collection.rate_per_litre ?? 0).toFixed(2)}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          ₹{Number(collection.total_amount ?? 0).toFixed(2)}
                        </td>
                        <td className="px-5 py-4">
                          <QualityBadge status={collection.quality_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 md:hidden">
                {rows.map((collection: any) => (
                  <article
                    key={collection.id}
                    className="p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-950">
                          {collection.suppliers?.name ?? 'Unknown supplier'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {collection.suppliers?.supplier_code ?? 'No supplier code'}
                        </p>
                      </div>
                      <QualityBadge status={collection.quality_status} />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <DataTile
                        label="Milk Type"
                        value={String(collection.milk_type ?? '—')}
                        capitalize
                      />
                      <DataTile
                        label="Quantity"
                        value={`${collection.quantity_litres ?? '—'} L`}
                      />
                      <DataTile
                        label="Fat"
                        value={
                          collection.fat_percent == null
                            ? '—'
                            : `${collection.fat_percent}%`
                        }
                      />
                      <DataTile
                        label="Rate"
                        value={`₹${Number(collection.rate_per_litre ?? 0).toFixed(2)}`}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3">
                      <span className="text-sm text-slate-500">
                        Total Amount
                      </span>
                      <span className="text-lg font-bold text-slate-950">
                        ₹{Number(collection.total_amount ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="px-5 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                🥛
              </div>
              <h3 className="mt-4 font-bold text-slate-900">
                No collections recorded today
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                Start by recording the milk received from a farmer or supplier.
              </p>
              <Link
                href="/admin/production/collections/new"
                className="mt-5 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700 active:scale-[0.99]"
              >
                + Record Collection
              </Link>
            </div>
          )}
        </section>

        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-amber-900">
              New collections start on <strong>Hold</strong> until they are cleared
              through Quality Control.
            </p>
            <Link
              href="/admin/production/quality"
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-amber-900 ring-1 ring-amber-200 transition hover:bg-amber-100 active:scale-[0.99]"
            >
              Open Quality Control →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group min-h-[126px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:scale-[0.99] md:p-5"
      aria-label={`${label}: ${value}. ${hint}`}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {label}
          </span>
          <span className="text-slate-300 transition group-hover:text-red-500">
            ↗
          </span>
        </div>
        <div>
          <p className="mt-3 text-xl font-bold text-slate-950 md:text-2xl">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {hint}
          </p>
        </div>
      </div>
    </Link>
  );
}

function DataTile({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`mt-1 font-semibold text-slate-900 ${
          capitalize ? 'capitalize' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function QualityBadge({ status }: { status: string | null }) {
  const normalized = status ?? 'hold';

  const styles: Record<string, string> = {
    passed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    rejected: 'bg-red-50 text-red-700 ring-red-200',
    hold: 'bg-amber-50 text-amber-700 ring-amber-200',
  };

  return (
    <span
      className={`inline-flex min-h-[28px] items-center rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ${
        styles[normalized] ?? 'bg-slate-100 text-slate-700 ring-slate-200'
      }`}
    >
      {normalized}
    </span>
  );
}
