'use client';

import Link from 'next/link';
import { formatAddress } from '@/lib/format-address';
import { formatProductUnit } from '@/lib/format-unit';
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
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const [{ data: prods }, { data: addr }] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('customer_addresses')
          .select('*')
          .eq('customer_id', user.id),
      ]);

      setProducts(prods ?? []);
      setAddresses(addr ?? []);
      setProductId(prods?.[0]?.id ?? '');
      setAddressId(
        addr?.find((a) => a.is_default)?.id ?? addr?.[0]?.id ?? ''
      );
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError(null);

    if (!productId || !addressId) {
      setError('Please choose a product and delivery address.');
      return;
    }

    setSubmitting(true);

    const result = await createSubscription({
      productId,
      quantity,
      frequency,
      addressId,
      paymentMethod,
      startDate,
    });

    if (result?.error) {
      setSubmitting(false);
      setError(result.error);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
        {/* Back */}
        <Link
          href="/dashboard/subscriptions"
          className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-medium text-gray-600 transition hover:bg-white hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <span aria-hidden="true">←</span>
          Subscriptions
        </Link>

        {/* Header */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl">
              🥛
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                Regular Delivery
              </p>

              <h1 className="mt-1 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                New Subscription
              </h1>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Choose a product, delivery schedule, address and payment
                method for your recurring order.
              </p>
            </div>
          </div>
        </section>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Product */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-bold text-gray-900">
              Product
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Select the product you want to receive regularly.
            </p>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold text-gray-800">
                Product
              </span>

              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                {products.length === 0 && (
                  <option value="">No products available</option>
                )}

                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatProductUnit(p.unit, p.net_quantity)})
                  </option>
                ))}
              </select>
            </label>
          </section>

          {/* Quantity and frequency */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-bold text-gray-900">
              Delivery Schedule
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Choose how much you need and how often it should be delivered.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-800">
                  Quantity per delivery
                </span>

                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-800">
                  Frequency
                </span>

                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="daily">Daily</option>
                  <option value="alternate_days">Alternate Days</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>
            </div>
          </section>

          {/* Address */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Delivery Address
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Select where your recurring delivery should arrive.
                </p>
              </div>

              <Link
                href="/dashboard/addresses"
                className="shrink-0 text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                Manage
              </Link>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold text-gray-800">
                Address
              </span>

              <select
                value={addressId}
                onChange={(e) => setAddressId(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                {addresses.length === 0 && (
                  <option value="">No delivery addresses available</option>
                )}

                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {formatAddress(a)}
                  </option>
                ))}
              </select>
            </label>

            {addresses.length === 0 && (
              <Link
                href="/dashboard/addresses"
                className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-brand-50 px-4 text-sm font-semibold text-brand-700 hover:bg-brand-100"
              >
                Add Delivery Address →
              </Link>
            )}
          </section>

          {/* Payment */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-bold text-gray-900">
              Payment Method
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Choose how each recurring delivery will be paid.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  paymentMethod === 'cod'
                    ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="sr-only"
                />

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm">
                    ₹
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Cash on Delivery
                    </p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Pay when your delivery arrives.
                    </p>
                  </div>
                </div>
              </label>

              <label
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  paymentMethod === 'upi_qr'
                    ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="upi_qr"
                  checked={paymentMethod === 'upi_qr'}
                  onChange={() => setPaymentMethod('upi_qr')}
                  className="sr-only"
                />

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm">
                    UPI
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      UPI
                    </p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Pay separately for each delivery.
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </section>

          {/* Start date */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-bold text-gray-900">
              Start Date
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Select when your recurring delivery should begin.
            </p>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold text-gray-800">
                Delivery start date
              </span>

              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </section>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <p className="font-semibold">Unable to create subscription</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {/* Submit */}
          <section className="rounded-2xl border border-brand-100 bg-brand-50 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Ready to start?
                </p>

                <p className="mt-1 text-xs text-gray-600">
                  Your recurring delivery will use the details selected above.
                </p>
              </div>

              <button
                type="submit"
                disabled={
                  submitting ||
                  !productId ||
                  !addressId ||
                  products.length === 0 ||
                  addresses.length === 0
                }
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {submitting ? 'Creating…' : 'Start Subscription'}
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}