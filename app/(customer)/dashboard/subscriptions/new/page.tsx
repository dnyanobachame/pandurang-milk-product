'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createSubscription } from '@/app/actions/subscriptions';
import type { Product, CustomerAddress } from '@/lib/types';

export default function NewSubscriptionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [productId, setProductId] = useState('');
  const [addressId, setAddressId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [frequency, setFrequency] = useState('daily');
  const [paymentMethod, setPaymentMethod] = useState<'upi_qr' | 'cod'>('cod');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: prods }, { data: addr }] = await Promise.all([
        supabase.from('products').select('*').eq('is_active', true).order('name'),
        supabase.from('customer_addresses').select('*').eq('customer_id', user.id),
      ]);
      setProducts(prods ?? []);
      setAddresses(addr ?? []);
      setProductId(prods?.[0]?.id ?? '');
      setAddressId(addr?.find((a) => a.is_default)?.id ?? addr?.[0]?.id ?? '');
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || !addressId) {
      setError('Please choose a product and delivery address.');
      return;
    }
    setSubmitting(true);
    const result = await createSubscription({
      productId, quantity, frequency, addressId, paymentMethod, startDate,
    });
    if (result?.error) {
      setSubmitting(false);
      setError(result.error);
    }
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">New Subscription</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium">
          Product
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.net_quantity}{p.unit})</option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Quantity per delivery
          <input
            type="number" min={1} value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
          />
        </label>

        <label className="block text-sm font-medium">
          Frequency
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
          >
            <option value="daily">Daily</option>
            <option value="alternate_days">Alternate Days</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>

        <label className="block text-sm font-medium">
          Delivery Address
          <select
            value={addressId}
            onChange={(e) => setAddressId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
          >
            {addresses.map((a) => (
              <option key={a.id} value={a.id}>{a.address_line}, {a.village_city}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Payment Method
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as 'upi_qr' | 'cod')}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
          >
            <option value="cod">Cash on Delivery</option>
            <option value="upi_qr">UPI (pay per delivery)</option>
          </select>
        </label>

        <label className="block text-sm font-medium">
          Start Date
          <input
            type="date" value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-normal"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-brand-600 text-white py-2.5 font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Start Subscription'}
        </button>
      </form>
    </main>
  );
}
