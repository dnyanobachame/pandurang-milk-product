
'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart-context';

export default function CartPage() {
  const {
    items,
    updateQuantity,
    removeItem,
    subtotal,
  } = useCart();

  return (
    <main className="min-h-screen bg-slate-50 pb-8">
      <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-5 sm:py-7 lg:px-6">

        {/* -------------------------------------------------------------- */}
        {/* HEADER                                                         */}
        {/* -------------------------------------------------------------- */}

        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-600">
            Shopping
          </p>

          <div className="mt-1 flex items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Your Cart
              </h1>

              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                Review your products before checkout.
              </p>
            </div>

            {items.length > 0 && (
              <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* EMPTY CART                                                     */}
        {/* -------------------------------------------------------------- */}

        {items.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center shadow-sm sm:py-16">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-2xl"
              aria-hidden="true"
            >
              🛒
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900">
              Your cart is empty
            </h2>

            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-5 text-slate-500">
              Add some fresh milk or other dairy products to your cart to
              get started.
            </p>

            <Link
              href="/products"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 active:scale-[0.98]"
            >
              Browse Products
              <span className="ml-1.5" aria-hidden="true">
                →
              </span>
            </Link>
          </section>
        ) : (
          <>
            {/* ---------------------------------------------------------- */}
            {/* CART ITEMS                                                   */}
            {/* ---------------------------------------------------------- */}

            <section aria-labelledby="cart-items">
              <h2
                id="cart-items"
                className="sr-only"
              >
                Cart items
              </h2>

              <div className="space-y-3">
                {items.map((item) => (
                  <article
                    key={item.productId}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      {/* Product information */}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-slate-900 sm:text-base">
                          {item.name}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {item.netQuantity}
                          {item.unit} × ₹{item.price}
                        </p>
                      </div>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 active:scale-95"
                        aria-label={`Remove ${item.name}`}
                      >
                        <span aria-hidden="true">✕</span>
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
                      {/* Quantity */}
                      <div className="flex items-center rounded-full border border-slate-200 bg-slate-50">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.quantity - 1,
                            )
                          }
                          disabled={item.quantity <= 1}
                          className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-slate-600 transition-colors hover:bg-white hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-inset disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          −
                        </button>

                        <span
                          className="w-8 text-center text-sm font-bold tabular-nums text-slate-900"
                          aria-label={`Quantity ${item.quantity}`}
                        >
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.quantity + 1,
                            )
                          }
                          className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-slate-600 transition-colors hover:bg-white hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-inset"
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          +
                        </button>
                      </div>

                      {/* Item total */}
                      <p className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">
                        ₹{item.price * item.quantity}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* ---------------------------------------------------------- */}
            {/* ORDER SUMMARY                                               */}
            {/* ---------------------------------------------------------- */}

            <section
              className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              aria-labelledby="order-summary"
            >
              <h2
                id="order-summary"
                className="text-base font-bold text-slate-900"
              >
                Order Summary
              </h2>

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
                    Delivery fee
                  </span>

                  <span className="text-right text-slate-400">
                    Calculated at checkout
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-slate-900">
                      Cart total
                    </span>

                    <span className="text-lg font-bold text-brand-700">
                      ₹{subtotal}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* ---------------------------------------------------------- */}
            {/* CHECKOUT                                                     */}
            {/* ---------------------------------------------------------- */}

            <Link
              href="/checkout"
              className="mt-5 flex min-h-12 w-full items-center justify-center rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 active:scale-[0.99]"
            >
              Proceed to Checkout
              <span className="ml-2" aria-hidden="true">
                →
              </span>
            </Link>

            <Link
              href="/products"
              className="mt-3 flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-200 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              Continue Shopping
            </Link>
          </>
        )}

        <p className="px-2 pt-6 text-center text-[10px] text-slate-400">
          Pandurang Milk Product • Fresh dairy delivered to your doorstep
        </p>
      </div>
    </main>
  );
}
