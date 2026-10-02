import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PackageBatchForm } from '@/components/production/PackageBatchForm';

export default async function ProductionBatchDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: batch, error } = await supabase
    .from('production_batches')
    .select(`
      id,
      batch_number,
      production_date,
      expiry_date,
      quantity_produced,
      quantity_packed,
      quantity_remaining,
      quality_status,
      products (
        id,
        name,
        unit,
        shelf_life_days
      )
    `)
    .eq('id', params.id)
    .maybeSingle();

  if (error || !batch) {
    notFound();
  }

  const product = Array.isArray(batch.products)
    ? batch.products[0]
    : batch.products;

  if (!product) {
    notFound();
  }

  const produced = Number(batch.quantity_produced ?? 0);
  const packed = Number(batch.quantity_packed ?? 0);
  const remaining = Number(batch.quantity_remaining ?? 0);

  const progress =
    produced > 0
      ? Math.min(100, Math.round((packed / produced) * 100))
      : 0;

  const status = batch.quality_status ?? 'hold';

  return (
    <main className="min-w-0 bg-slate-50 px-4 py-5 pb-8 md:px-8 md:py-7">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Link
                href="/admin/production/batches"
                className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 active:scale-[0.99]"
              >
                ← Production Batches
              </Link>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <QualityBadge status={status} />
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  Batch Detail
                </span>
              </div>

              <h1 className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                {product.name}
              </h1>

              <p className="mt-2 break-all font-mono text-sm font-semibold text-slate-500">
                {batch.batch_number}
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

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label="Produced"
            value={`${formatQuantity(produced)} ${product.unit}`}
          />
          <MetricCard
            label="Packed"
            value={`${formatQuantity(packed)} ${product.unit}`}
          />
          <MetricCard
            label="Remaining"
            value={`${formatQuantity(remaining)} ${product.unit}`}
          />
          <MetricCard
            label="Packaging"
            value={`${progress}%`}
          />
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <SectionHeading
              title="Batch Overview"
              description="Production and packaging information for this batch."
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Info label="Product" value={product.name} />
              <Info label="Unit" value={product.unit ?? '—'} />
              <Info label="Batch Number" value={batch.batch_number} />
              <Info
                label="Production Date"
                value={batch.production_date ?? '—'}
              />
              <Info
                label="Expiry Date"
                value={batch.expiry_date ?? '—'}
              />
              <Info
                label="Shelf Life"
                value={
                  product.shelf_life_days == null
                    ? '—'
                    : `${product.shelf_life_days} days`
                }
              />
              <Info
                label="Quality Status"
                value={status}
              />
              <Info
                label="Remaining"
                value={`${formatQuantity(remaining)} ${product.unit}`}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <SectionHeading
              title="Packaging Progress"
              description="Track how much of this batch has been packaged."
            />

            <div className="mt-6">
              <div className="flex items-end justify-between gap-3">
                <span className="text-3xl font-bold text-slate-950">
                  {progress}%
                </span>
                <span className="text-sm text-slate-500">
                  {formatQuantity(packed)} / {formatQuantity(produced)}
                </span>
              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-red-600"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <SmallMetric
                  label="Packed"
                  value={formatQuantity(packed)}
                />
                <SmallMetric
                  label="Remaining"
                  value={formatQuantity(remaining)}
                />
              </div>
            </div>
          </section>
        </div>

        {status === 'passed' && remaining > 0 && (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <SectionHeading
              title="Package Batch"
              description={`Up to ${formatQuantity(remaining)} ${product.unit} can be packaged.`}
            />

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <PackageBatchForm
                productionBatchId={batch.id}
                productId={product.id}
                unit={product.unit}
                maxQuantity={remaining}
                suggestedExpiry={batch.expiry_date}
              />
            </div>
          </section>
        )}

        {status === 'hold' && (
          <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex gap-3">
              <span className="text-lg" aria-hidden="true">
                ⚠️
              </span>
              <div>
                <h2 className="font-bold text-amber-950">
                  Quality Control required
                </h2>
                <p className="mt-1 text-sm leading-6 text-amber-900">
                  This batch is on hold and cannot be packaged until it is
                  cleared through Quality Control.
                </p>
                <Link
                  href="/admin/production/quality"
                  className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-amber-900 ring-1 ring-amber-200 transition hover:bg-amber-100"
                >
                  Open Quality Control →
                </Link>
              </div>
            </div>
          </section>
        )}

        {status === 'rejected' && (
          <section className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5">
            <h2 className="font-bold text-red-950">
              Batch rejected
            </h2>
            <p className="mt-1 text-sm leading-6 text-red-700">
              This batch is rejected and is not available for packaging.
            </p>
          </section>
        )}

        {status === 'passed' && remaining <= 0 && (
          <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <h2 className="font-bold text-emerald-950">
              Batch fully packaged
            </h2>
            <p className="mt-1 text-sm leading-6 text-emerald-700">
              All produced quantity has been packaged.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-h-[112px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-xl font-bold text-slate-950 md:text-2xl">
        {value}
      </p>
    </div>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-950">{value}</p>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold capitalize text-slate-900">
        {value}
      </p>
    </div>
  );
}

function QualityBadge({
  status,
}: {
  status: string | null;
}) {
  const normalized = status ?? 'hold';

  const styles: Record<string, string> = {
    passed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    rejected: 'bg-red-50 text-red-700 ring-red-200',
    hold: 'bg-amber-50 text-amber-700 ring-amber-200',
  };

  return (
    <span
      className={`inline-flex min-h-[28px] items-center rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ${
        styles[normalized] ??
        'bg-slate-100 text-slate-700 ring-slate-200'
      }`}
    >
      {normalized}
    </span>
  );
}

function formatQuantity(value: number) {
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toFixed(2);
}
