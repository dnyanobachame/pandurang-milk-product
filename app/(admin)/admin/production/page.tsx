import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function ProductionIndexPage() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { count: todayCollections },
    { count: pendingQuality },
    { count: activeBatches },
  ] = await Promise.all([
    supabase
      .from('milk_collections')
      .select('id', { count: 'exact', head: true })
      .gte('collection_date', today),
    supabase
      .from('milk_collections')
      .select('id', { count: 'exact', head: true })
      .eq('quality_status', 'hold'),
    supabase
      .from('production_batches')
      .select('id', { count: 'exact', head: true })
      .eq('quality_status', 'passed'),
  ]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        {/* Header */}
        <header className="mb-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <Link
                  href="/admin"
                  className="rounded-md px-1 py-1 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  Admin
                </Link>
                <span aria-hidden="true">/</span>
                <span className="font-medium text-slate-700">Production</span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Production
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Manage daily milk collection, quality checks, production batches, and packaging.
              </p>
            </div>

            <Link
              href="/admin/production/collections/new"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 sm:w-auto"
            >
              + Record Milk Collection
            </Link>
          </div>
        </header>

        {/* Production KPIs */}
        <section
          aria-label="Production summary"
          className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <Stat
            label="Today's Collections"
            value={todayCollections ?? 0}
            helper="Milk collection records today"
          />
          <Stat
            label="Pending Quality Check"
            value={pendingQuality ?? 0}
            helper={
              pendingQuality
                ? 'Requires quality review'
                : 'No milk collections on hold'
            }
            tone={pendingQuality ? 'warn' : undefined}
          />
          <Stat
            label="Approved Batches"
            value={activeBatches ?? 0}
            helper="Production batches marked passed"
          />
        </section>

        {/* Production modules */}
        <section aria-labelledby="production-modules-heading">
          <div className="mb-4">
            <h2
              id="production-modules-heading"
              className="text-lg font-bold text-slate-950"
            >
              Production Operations
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Open a production workflow to record, review, or manage inventory output.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <ModuleCard
              href="/admin/production/collections"
              title="Milk Collection"
              desc="Record and review daily collections from farmers."
              stat={todayCollections ?? 0}
              statLabel="today"
              icon="MC"
            />
            <ModuleCard
              href="/admin/production/quality"
              title="Quality Control"
              desc="Clear collections and production batches currently on hold."
              stat={pendingQuality ?? 0}
              statLabel="pending"
              icon="QC"
              tone={pendingQuality ? 'warn' : undefined}
            />
            <ModuleCard
              href="/admin/production/batches"
              title="Production Batches"
              desc="Create batches and package approved production into inventory."
              stat={activeBatches ?? 0}
              statLabel="approved"
              icon="PB"
            />
          </div>
        </section>

        {/* Workflow */}
        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-950 sm:text-lg">
                Production Workflow
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Follow the operational flow from incoming milk to packaged production.
              </p>
            </div>

            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Daily operations
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <WorkflowStep
              number="01"
              title="Collect"
              description="Record farmer milk collections and quantities."
              href="/admin/production/collections"
            />
            <WorkflowStep
              number="02"
              title="Check Quality"
              description="Review items placed on quality hold."
              href="/admin/production/quality"
            />
            <WorkflowStep
              number="03"
              title="Produce & Pack"
              description="Create approved batches and package them."
              href="/admin/production/batches"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  tone?: 'warn';
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${
        tone === 'warn'
          ? 'border-amber-200 bg-amber-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={`text-xs font-semibold uppercase tracking-wide ${
            tone === 'warn' ? 'text-amber-700' : 'text-slate-500'
          }`}
        >
          {label}
        </p>

        {tone === 'warn' && (
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
        )}
      </div>

      <p
        className={`mt-2 text-3xl font-bold ${
          tone === 'warn' ? 'text-amber-950' : 'text-slate-950'
        }`}
      >
        {value}
      </p>

      <p
        className={`mt-1 text-xs ${
          tone === 'warn' ? 'text-amber-700' : 'text-slate-500'
        }`}
      >
        {helper}
      </p>
    </div>
  );
}

function ModuleCard({
  href,
  title,
  desc,
  stat,
  statLabel,
  icon,
  tone,
}: {
  href: string;
  title: string;
  desc: string;
  stat: number;
  statLabel: string;
  icon: string;
  tone?: 'warn';
}) {
  return (
    <Link
      href={href}
      className={`group block min-h-[190px] rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${
        tone === 'warn'
          ? 'border-amber-200'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-xs font-bold ${
            tone === 'warn'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {icon}
        </span>

        <span className="text-lg text-slate-400 transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </div>

      <h3 className="mt-5 text-base font-bold text-slate-950">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{desc}</p>

      <div className="mt-4 flex items-center gap-2 text-xs font-semibold">
        <span className={tone === 'warn' ? 'text-amber-800' : 'text-slate-800'}>
          {stat}
        </span>
        <span className="text-slate-400">{statLabel}</span>
      </div>
    </Link>
  );
}

function WorkflowStep({
  number,
  title,
  description,
  href,
}: {
  number: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
          {number}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
    </Link>
  );
}
