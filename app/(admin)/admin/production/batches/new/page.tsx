'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createProductionBatch } from '@/app/actions/production';

type Product = { id: string; name: string; sku: string; shelf_life_days: number | null };
type Collection = { id: string; quantity_litres: number; milk_type: string; collection_date: string; suppliers: { name: string } | null };

export default function NewProductionBatchPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [productId, setProductId] = useState('');
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [quantityProduced, setQuantityProduced] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('products').select('id, name, sku, shelf_life_days').eq('is_active', true).order('name'),
      // Only *passed* collections not already fully consumed by a batch are
      // eligible — this is what makes the traceability chain meaningful.
      supabase
        .from('milk_collections')
        .select('id, quantity_litres, milk_type, collection_date, suppliers(name)')
        .eq('quality_status', 'passed')
        .order('collection_date', { ascending: false })
        .limit(50),
    ]).then(([{ data: prods }, { data: cols }]) => {
      setProducts(prods ?? []);
      setCollections((cols as any) ?? []);
      if (prods?.[0]) setProductId(prods[0].id);
    });
  }, []);

  function toggleCollection(id: string) {
    setSelectedCollections((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  const selectedProduct = products.find((p) => p.id === productId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct) return;
    setSaving(true);
    setError(null);
    const result = await createProductionBatch({
      productId,
      productCode: selectedProduct.sku.replace(/[^A-Z0-9]/gi, '').slice(0, 6).toUpperCase(),
      milkCollectionIds: selectedCollections,
      quantityProduced: Number(quantityProduced),
      shelfLifeDays: selectedProduct.shelf_life_days ?? 3,
      notes: notes || undefined,
    });
    if (result?.error) {
      setSaving(false);
      setError(result.error);
    }
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">New Production Batch</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium">
          Product
          <select
            value={productId} onChange={(e) => setProductId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
          >
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Quantity Produced
          <input
            type="number" min={1} required value={quantityProduced}
            onChange={(e) => setQuantityProduced(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
          />
        </label>

        <div>
          <p className="text-sm font-medium mb-1">Source Milk Collections (quality-passed)</p>
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y">
            {collections.map((c) => (
              <label key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCollections.includes(c.id)}
                  onChange={() => toggleCollection(c.id)}
                />
                {c.suppliers?.name} — {c.quantity_litres}L {c.milk_type} ({c.collection_date})
              </label>
            ))}
            {collections.length === 0 && (
              <p className="text-sm text-gray-500 px-3 py-4">
                No quality-passed collections available. Clear some in Quality Control first.
              </p>
            )}
          </div>
        </div>

        <label className="block text-sm font-medium">
          Notes (optional)
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
            rows={2}
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit" disabled={saving}
          className="w-full rounded-full bg-brand-600 text-white py-2.5 font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? 'Creating…' : 'Create Batch'}
        </button>
      </form>
    </main>
  );
}
