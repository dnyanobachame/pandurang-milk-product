'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCart } from '@/lib/cart-context';
import { placeOrder } from '@/app/actions/orders';
import type { CustomerAddress } from '@/lib/types';
import { formatAddress } from '@/lib/format-address';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressId, setAddressId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'upi_qr' | 'cod'>('upi_qr');
  const [deliverySlot, setDeliverySlot] = useState('Morning (6–9 AM)');
  const [codEnabled, setCodEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login?redirectTo=/checkout');
        return;
      }
      const [{ data: addr }, { data: settings }] = await Promise.all([
        supabase.from('customer_addresses').select('*').eq('customer_id', user.id),
        supabase.from('company_settings').select('cod_enabled').single(),
      ]);
      setAddresses(addr ?? []);
      setAddressId(addr?.find((a) => a.is_default)?.id ?? addr?.[0]?.id ?? '');
      setCodEnabled(settings?.cod_enabled ?? true);
    })();
  }, [router]);

  if (items.length === 0) {
    return (
      <main className="max-w-xl mx-auto px-6 py-16 text-center">
        <p className="text-gray-500">Your cart is empty.</p>
        <a href="/products" className="text-brand-700 font-medium">Browse products →</a>
      </main>
    );
  }

  async function handlePlaceOrder() {
    if (!addressId) {
      setError('Please select a delivery address.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const result = await placeOrder({
      items,
      addressId,
      paymentMethod,
      deliverySlot,
    });

    // placeOrder redirects on success (throws internally), so reaching here
    // means it returned an error instead.
    if (result?.error) {
      setSubmitting(false);
      setError(result.error);
      return;
    }
    clear();
  }

  return (
    <main className="max-w-xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Checkout</h1>

      <section className="mb-6">
        <h2 className="font-medium mb-2">Delivery Address</h2>
        {addresses.length === 0 ? (
          <p className="text-sm text-gray-500">
            No saved address. <a href="/dashboard/addresses" className="text-brand-700">Add one →</a>
          </p>
        ) : (
          <div className="space-y-2">
            {addresses.map((a) => (
              <label
                key={a.id}
                className={`block rounded-xl2 border p-3 text-sm cursor-pointer ${
                  addressId === a.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="address"
                  className="mr-2"
                  checked={addressId === a.id}
                  onChange={() => setAddressId(a.id)}
                />
                {formatAddress(a)}
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="font-medium mb-2">Delivery Slot</h2>
        <select
          value={deliverySlot}
          onChange={(e) => setDeliverySlot(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option>Morning (6–9 AM)</option>
          <option>Evening (5–8 PM)</option>
        </select>
      </section>

      <section className="mb-6">
        <h2 className="font-medium mb-2">Payment Method</h2>
        <div className="space-y-2">
          <label className={`block rounded-xl2 border p-3 text-sm cursor-pointer ${paymentMethod === 'upi_qr' ? 'border-brand-500 bg-brand-50' : 'border-gray-200'}`}>
            <input type="radio" name="pm" className="mr-2" checked={paymentMethod === 'upi_qr'} onChange={() => setPaymentMethod('upi_qr')} />
            Pay via UPI (QR Code)
          </label>
          {codEnabled && (
            <label className={`block rounded-xl2 border p-3 text-sm cursor-pointer ${paymentMethod === 'cod' ? 'border-brand-500 bg-brand-50' : 'border-gray-200'}`}>
              <input type="radio" name="pm" className="mr-2" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
              Cash on Delivery
            </label>
          )}
        </div>
      </section>

      <div className="rounded-xl2 border border-gray-100 bg-white p-4 text-sm mb-6">
        <div className="flex justify-between">
          <span className="text-gray-500">Subtotal</span>
          <span>₹{subtotal}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Delivery fee and tax are calculated when the order is placed.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <button
        onClick={handlePlaceOrder}
        disabled={submitting}
        className="w-full rounded-full bg-brand-600 text-white py-3 font-medium hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? 'Placing order…' : 'Place Order'}
      </button>
    </main>
  );
}
