import { createClient } from '@/lib/supabase/server';
import { AddToCartButton } from '@/components/AddToCartButton';
import { ProductWhatsAppButton } from '@/components/ProductWhatsAppButton';
import { StockBadge } from '@/components/StockBadge';
import { formatProductUnit } from '@/lib/format-unit';
import Link from 'next/link';
import type { Product, ProductCategory } from '@/lib/types';

export const revalidate = 30;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const supabase = createClient();

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from('product_categories').select('id, name, name_marathi').order('sort_order'),
    supabase
      .from('products')
      .select(
        'id, name, name_marathi, category_id, sku, unit, net_quantity, selling_price, mrp, image_url, available_quantity, min_stock_level, delivery_available, is_active'
      )
      .eq('is_active', true)
      .order('name'),
  ]);

  const activeCategory = searchParams.category;
  const filtered = activeCategory
    ? (products as Product[] | null)?.filter((p) => p.category_id === activeCategory)
    : products;

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Our Products</h1>
        <Link href="/cart" className="text-sm text-brand-700 font-medium">
          View Cart →
        </Link>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        <CategoryPill href="/products" label="All" active={!activeCategory} />
        {(categories as ProductCategory[] | null)?.map((c) => (
          <CategoryPill
            key={c.id}
            href={`/products?category=${c.id}`}
            label={c.name}
            active={activeCategory === c.id}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {(filtered ?? []).map((p) => (
          <div key={p.id} className="rounded-xl2 border border-gray-100 bg-white p-4 shadow-sm">
            <div className="aspect-square rounded-lg bg-cream-100 mb-3 overflow-hidden">
              {p.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
              )}
            </div>
            <h3 className="font-medium text-sm">{p.name}</h3>
            {p.name_marathi && <p className="text-xs text-gray-500">{p.name_marathi}</p>}
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-semibold text-brand-700">₹{p.selling_price}</span>
              {p.mrp && p.mrp > p.selling_price && (
                <span className="text-xs text-gray-400 line-through">₹{p.mrp}</span>
              )}
              <span className="text-xs text-gray-500">/ {formatProductUnit(p.unit, p.net_quantity)}</span>
            </div>
            <StockBadge
              availableQuantity={p.available_quantity}
              lowStockThreshold={(p as unknown as { min_stock_level?: number }).min_stock_level}
            />
            <AddToCartButton product={p} />
            <ProductWhatsAppButton name={p.name} price={p.selling_price} />
          </div>
        ))}
        {(!filtered || filtered.length === 0) && (
          <p className="text-gray-500 col-span-full">No products in this category yet.</p>
        )}
      </div>
    </main>
  );
}

function CategoryPill({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm border ${
        active
          ? 'bg-brand-600 text-white border-brand-600'
          : 'bg-white text-gray-600 border-gray-200'
      }`}
    >
      {label}
    </Link>
  );
}
