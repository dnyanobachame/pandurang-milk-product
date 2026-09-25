'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart-context';

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Your Cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">Your cart is empty.</p>
          <Link href="/products" className="text-brand-700 font-medium">
            Browse products →
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between rounded-xl2 border border-gray-100 bg-white p-4"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-500">
                    {item.netQuantity}{item.unit} × ₹{item.price}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-gray-200 rounded-full">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="px-2.5 py-1 text-gray-500"
                    >
                      −
                    </button>
                    <span className="px-1 text-sm w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="px-2.5 py-1 text-gray-500"
                    >
                      +
                    </button>
                  </div>
                  <p className="font-semibold w-16 text-right">₹{item.price * item.quantity}</p>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-red-500 text-sm"
                    aria-label={`Remove ${item.name}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl2 border border-gray-100 bg-white p-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Delivery fee</span>
              <span>Calculated at checkout</span>
            </div>
          </div>

          <Link
            href="/checkout"
            className="mt-6 block text-center rounded-full bg-brand-600 text-white py-3 font-medium hover:bg-brand-700 transition"
          >
            Proceed to Checkout
          </Link>
        </>
      )}
    </main>
  );
}
