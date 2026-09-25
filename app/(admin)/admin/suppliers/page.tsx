import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function SuppliersPage() {
  const supabase = createClient();

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, supplier_code, name, mobile, village, is_active, outstanding_balance')
    .order('name');

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Suppliers / Farmers</h1>
        <Link href="/admin/suppliers/new" className="text-sm rounded-full bg-brand-600 text-white px-4 py-2">
          + Add Supplier
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 pr-4">Code</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Mobile</th>
              <th className="py-2 pr-4">Village</th>
              <th className="py-2 pr-4">Outstanding</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {(suppliers ?? []).map((s) => (
              <tr key={s.id} className="border-b border-gray-50">
                <td className="py-2 pr-4 font-mono text-xs">{s.supplier_code}</td>
                <td className="py-2 pr-4">{s.name}</td>
                <td className="py-2 pr-4">{s.mobile}</td>
                <td className="py-2 pr-4">{s.village}</td>
                <td className="py-2 pr-4">₹{s.outstanding_balance}</td>
                <td className="py-2 pr-4">{s.is_active ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
            {(!suppliers || suppliers.length === 0) && (
              <tr><td colSpan={6} className="py-6 text-gray-500 text-center">No suppliers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
