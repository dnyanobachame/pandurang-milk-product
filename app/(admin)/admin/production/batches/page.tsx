import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PackageBatchForm } from '@/components/production/PackageBatchForm';

export default async function ProductionBatchesPage() {
  const supabase = createClient();

  const { data: batches, error } = await supabase
    .from('production_batches')
    .select(`
      id, batch_number, production_date, expiry_date, quantity_produced,
      quantity_packed, quantity_remaining, quality_status,
      products ( id, name, unit, shelf_life_days )
    `)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    throw new Error(`Failed to load production batches: ${error.message}`);
  }

  const rows = batches ?? [];

  const totalProduced = rows.reduce(
    (sum, batch) => sum + Number(batch.quantity_produced ?? 0),
    0
  );
  const totalPacked = rows.reduce(
    (sum, batch) => sum + Number(batch.quantity_packed ?? 0),
    0
  );
  const totalRemaining = rows.reduce(
    (sum, batch) => sum + Number(batch.quantity_remaining ?? 0),
    0
  );
  const passedCount = rows.filter(
    (batch) => batch.quality_status === 'passed'
  ).length;
  const holdCount = rows.filter(
    (batch) => batch.quality_status === 'hold'
  ).length;
  const rejectedCount = rows.filter(
    (batch) => batch.quality_status === 'rejected'
  ).length;

  return (
    <main className="min-w-0 bg-slate-50 px-4 py-5 pb-8 md:px-8 md:py-7">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/admin/production"
                  className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 active:scale-[0.99]"
                >
                  ← Production
                </Link>
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                  Manufacturing
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                Production Batches
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
                Track produced quantities, packaging progress, remaining stock,
                and batch quality status.
              </p>
            </div>

            <Link
              href="/admin/production/batches/new"
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.99] sm:w-auto"
            >
              + New Batch
            </Link>
          </div>
        </header>

        <section
          aria-label="Production batch statistics"
          className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          <StatCard
            label="Batches"
            value={rows.length.toLocaleString()}
            hint="Latest 30 batches"
            href="#batch-list"
          />
          <StatCard
            label="Produced"
            value={formatQuantity(totalProduced)}
            hint="Total quantity"
            href="#batch-list"
          />
          <StatCard
            label="Packed"
            value={formatQuantity(totalPacked)}
            hint={`${formatQuantity(totalRemaining)} remaining`}
            href="#batch-list"
          />
          <StatCard
            label="Quality"
            value={`${passedCount} passed`}
            hint={`${holdCount} hold · ${rejectedCount} rejected`}
            href="#batch-list"
          />
        </section>

        <section
          id="batch-list"
          className="mt-5 scroll-mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between md:p-5">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Recent Production Batches
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Newest production batches appear first.
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
            <div className="divide-y divide-slate-100">
              {rows.map((batch: any) => {
                const produced = Number(batch.quantity_produced ?? 0);
                const packed = Number(batch.quantity_packed ?? 0);
                const remaining = Number(batch.quantity_remaining ?? 0);
                const packProgress =
                  produced > 0
                    ? Math.min(100, Math.round((packed / produced) * 100))
                    : 0;

                return (
                  <article
                    key={batch.id}
                    className="p-4 transition hover:bg-slate-50 md:p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-950">
                            {batch.products?.name ?? 'Unknown product'}
                          </h3>
                          <QualityBadge status={batch.quality_status} />
                        </div>

                        <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-500">
                          {batch.batch_number}
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                          Produced {batch.production_date} · Expires {batch.expiry_date}
                        </p>
                      </div>

                      <Link
                        href={`/admin/production/batches/${batch.id}`}
                        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] lg:w-auto"
                      >
                        View Batch →
                      </Link>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                      <Metric label="Produced" value={formatQuantity(produced)} />
                      <Metric label="Packed" value={formatQuantity(packed)} />
                      <Metric label="Remaining" value={formatQuantity(remaining)} />
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">
                          Packaging progress
                        </span>
                        <span className="font-bold text-slate-900">
                          {packProgress}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-red-600 transition-all"
                          style={{ width: `${packProgress}%` }}
                        />
                      </div>
                    </div>

                    {batch.quality_status === 'passed' &&
                      packed < produced &&
                      batch.products && (
                        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="mb-3">
                            <p className="font-bold text-slate-900">
                              Package this batch
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Up to {formatQuantity(produced - packed)}{' '}
                              {batch.products.unit} remaining to package.
                            </p>
                          </div>

                          <PackageBatchForm
                            productionBatchId={batch.id}
                            productId={batch.products.id}
                            unit={batch.products.unit}
                            maxQuantity={produced - packed}
                            suggestedExpiry={batch.expiry_date}
                          />
                        </div>
                      )}

                    {batch.quality_status === 'hold' && (
                      <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <span aria-hidden="true">⚠️</span>
                        <p className="text-sm leading-6 text-amber-900">
                          Awaiting Quality Control before this batch can be packaged.
                        </p>
                      </div>
                    )}

                    {batch.quality_status === 'rejected' && (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                        This batch is rejected and is not available for packaging.
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                📦
              </div>
              <h3 className="mt-4 font-bold text-slate-900">
                No production batches yet
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                Create a production batch from quality-passed milk collections
                to begin manufacturing.
              </p>
              <Link
                href="/admin/production/batches/new"
                className="mt-5 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700 active:scale-[0.99]"
              >
                + New Batch
              </Link>
            </div>
          )}
        </section>
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
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
      </div>
    </Link>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-950">{value}</p>
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

function formatQuantity(value: number) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
}
