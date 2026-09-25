import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function ProductionIndexPage() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ count: todayCollections }, { count: pendingQuality }, { count: activeBatches }] =
    await Promise.all([
      supabase.from('milk_collections').select('id', { count: 'exact', head: true }).gte('collection_date', today),
      supabase.from('milk_collections').select('id', { count: 'exact', head: true }).eq('quality_status', 'hold'),
      supabase.from('production_batches').select('id', { count: 'exact', head: true }).eq('quality_status', 'passed'),
    ]);

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Production</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Stat label="Today's Collections" value={todayCollections ?? 0} />
        <Stat label="Pending Quality Check" value={pendingQuality ?? 0} tone={pendingQuality ? 'warn' : undefined} />
        <Stat label="Approved Batches" value={activeBatches ?? 0} />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <ModuleCard href="/admin/production/collections" title="Milk Collection" desc="Record and review daily collections from farmers." />
        <ModuleCard href="/admin/production/quality" title="Quality Control" desc="Clear collections and batches on hold." />
        <ModuleCard href="/admin/production/batches" title="Production Batches" desc="Create batches and package them into inventory." />
      </div>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'warn' }) {
  return (
    <div className={`rounded-xl2 border p-4 ${tone === 'warn' ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-white'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function ModuleCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="rounded-xl2 border border-gray-100 bg-white p-4 hover:border-brand-300 transition">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-gray-500 mt-1">{desc}</p>
    </Link>
  );
}
