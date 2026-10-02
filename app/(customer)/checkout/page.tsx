
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
  const [paymentMethod, setPaymentMethod] = useState<'upi_qr' | 'cod'>(
    'upi_qr',
  );
  const [deliverySlot, setDeliverySlot] = useState('Morning (6–9 AM)');
  const [codEnabled, setCodEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login?redirectTo=/checkout');
        return;
      }

      const [{ data: addr }, { data: settings }] = await Promise.all([
        supabase
          .from('customer_addresses')
          .select('*')
          .eq('customer_id', user.id),

        supabase
          .from('company_settings')
          .select('cod_enabled')
          .single(),
      ]);

      setAddresses(addr ?? []);
      setAddressId(
        addr?.find((a) => a.is_default)?.id ??
          addr?.[0]?.id ??
          '',
      );
      setCodEnabled(settings?.cod_enabled ?? true);
    })();
  }, [router]);

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 px-3 py-8 sm:px-5 sm:py-12">
        <div className="mx-auto max-w-xl">
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center shadow-sm">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-2xl"
              aria-hidden="true"
            >
              🛒
            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-900">
              Your cart is empty
            </h1>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-slate-500">
              Add some products before continuing to checkout.
            </p>

            <a
              href="/products"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              Browse Products
              <span className="ml-1.5" aria-hidden="true">
                →
              </span>
            </a>
          </section>
        </div>
      </main>
    );
  }

  async function handlePlaceOrder() {
    if (!addressId) {
      setError('Please select a delivery address.');
      return;
    }

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await placeOrder({
        items,
        addressId,
        paymentMethod,
        deliverySlot,
      });

      // placeOrder redirects on success (throws internally), so reaching
      // here means it returned an error instead.
      if (result?.error) {
        setSubmitting(false);
        setError(result.error);
        return;
      }

      clear();
    } catch {
      setSubmitting(false);
      setError('Unable to place your order. Please try again.');
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-8">
      <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-5 sm:py-7 lg:px-6">

        {/* -------------------------------------------------------------- */}
        {/* PAGE HEADER                                                     */}
        {/* -------------------------------------------------------------- */}

        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-600">
            Order
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Checkout
          </h1>

          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            Confirm your delivery details and payment method.
          </p>
        </div>

        <div className="space-y-4">

          {/* ------------------------------------------------------------ */}
          {/* DELIVERY ADDRESS                                              */}
          {/* ------------------------------------------------------------ */}

          <section
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            aria-labelledby="delivery-address"
          >
            <div className="mb-4">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm"
                  aria-hidden="true"
                >
                  📍
                </span>

                <div>
                  <h2
                    id="delivery-address"
                    className="text-sm font-bold text-slate-900 sm:text-base"
                  >
                    Delivery Address
                  </h2>

                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Where should we deliver your order?
                  </p>
                </div>
              </div>
            </div>

            {addresses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="text-sm text-slate-600">
                  No saved address.
                </p>

                <a
                  href="/dashboard/addresses"
                  className="mt-2 inline-flex min-h-11 items-center font-semibold text-brand-700 focus:outline-none focus:underline"
                >
                  Add a delivery address
                  <span className="ml-1" aria-hidden="true">
                    →
                  </span>
                </a>
              </div>
            ) : (
              <div className="space-y-2.5">
                {addresses.map((a) => {
                  const selected = addressId === a.id;

                  return (
                    <label
                      key={a.id}
                      className={`flex min-h-[72px] cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-1 ${
                        selected
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-slate-200 bg-white hover:border-brand-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={selected}
                        onChange={() => setAddressId(a.id)}
                        className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
                      />

                      <span className="min-w-0 flex-1 text-sm leading-5 text-slate-700">
                        {formatAddress(a)}
                      </span>
                    </label>
                  );
                })}

                <a
                  href="/dashboard/addresses"
                  className="inline-flex min-h-10 items-center text-xs font-semibold text-brand-700 hover:text-brand-800 focus:outline-none focus:underline"
                >
                  Manage saved addresses
                  <span className="ml-1" aria-hidden="true">
                    →
                  </span>
                </a>
              </div>
            )}
          </section>

          {/* ------------------------------------------------------------ */}
          {/* DELIVERY SLOT                                                 */}
          {/* ------------------------------------------------------------ */}

          <section
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            aria-labelledby="delivery-slot"
          >
            <div className="mb-4 flex items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-sm"
                aria-hidden="true"
              >
                🕐
              </span>

              <div>
                <h2
                  id="delivery-slot"
                  className="text-sm font-bold text-slate-900 sm:text-base"
                >
                  Delivery Slot
                </h2>

                <p className="mt-0.5 text-[11px] text-slate-500">
                  Choose when you prefer your order.
                </p>
              </div>
            </div>

            <select
              value={deliverySlot}
              onChange={(e) => setDeliverySlot(e.target.value)}
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            >
              <option>Morning (6–9 AM)</option>
              <option>Evening (5–8 PM)</option>
            </select>
          </section>

          {/* ------------------------------------------------------------ */}
          {/* PAYMENT METHOD                                                */}
          {/* ------------------------------------------------------------ */}

          <section
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            aria-labelledby="payment-method"
          >
            <div className="mb-4 flex items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm"
                aria-hidden="true"
              >
                ₹
              </span>

              <div>
                <h2
                  id="payment-method"
                  className="text-sm font-bold text-slate-900 sm:text-base"
                >
                  Payment Method
                </h2>

                <p className="mt-0.5 text-[11px] text-slate-500">
                  Select how you want to pay.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <label
                className={`flex min-h-[64px] cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-1 ${
                  paymentMethod === 'upi_qr'
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-slate-200 hover:border-brand-200'
                }`}
              >
                <input
                  type="radio"
                  name="pm"
                  checked={paymentMethod === 'upi_qr'}
                  onChange={() => setPaymentMethod('upi_qr')}
                  className="h-4 w-4 accent-brand-600"
                />

                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">
                    Pay via UPI
                  </span>

                  <span className="mt-0.5 block text-xs text-slate-500">
                    QR Code payment
                  </span>
                </span>
              </label>

              {codEnabled && (
                <label
                  className={`flex min-h-[64px] cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-1 ${
                    paymentMethod === 'cod'
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-slate-200 hover:border-brand-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="pm"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="h-4 w-4 accent-brand-600"
                  />

                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">
                      Cash on Delivery
                    </span>

                    <span className="mt-0.5 block text-xs text-slate-500">
                      Pay when your order arrives
                    </span>
                  </span>
                </label>
              )}
            </div>
          </section>

          {/* ------------------------------------------------------------ */}
          {/* ORDER SUMMARY                                                 */}
          {/* ------------------------------------------------------------ */}

          <section
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            aria-labelledby="order-summary"
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                id="order-summary"
                className="text-base font-bold text-slate-900"
              >
                Order Summary
              </h2>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">
                  Subtotal
                </span>

                <span className="font-semibold text-slate-900">
                  ₹{subtotal}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 text-xs">
                <span className="text-slate-500">
                  Delivery fee & tax
                </span>

                <span className="max-w-[190px] text-right leading-5 text-slate-400">
                  Calculated when the order is placed
                </span>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-bold text-slate-900">
                    Order total
                  </span>

                  <span className="text-xl font-bold text-brand-700">
                    ₹{subtotal}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ------------------------------------------------------------ */}
          {/* ERROR                                                         */}
          {/* ------------------------------------------------------------ */}

          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-4"
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-100 text-sm font-bold text-red-700"
                  aria-hidden="true"
                >
                  !
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-red-900">
                    Unable to place order
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-700">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------ */}
          {/* PLACE ORDER                                                   */}
          {/* ------------------------------------------------------------ */}

          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={submitting}
            aria-busy={submitting}
            className="flex min-h-12 w-full items-center justify-center rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Placing order…' : 'Place Order'}
          </button>

          <a
            href="/cart"
            className="flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-200 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Back to Cart
          </a>
        </div>

        <p className="px-2 pt-6 text-center text-[10px] text-slate-400">
          Pandurang Milk Product • Secure checkout
        </p>
      </div>
    </main>
  );
}
