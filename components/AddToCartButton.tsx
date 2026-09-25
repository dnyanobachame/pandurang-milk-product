'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart-context';
import type { Product } from '@/lib/types';

export function AddToCartButton({ product }: { product: Product }) {
  const { addItem, items } = useCart();
  const [qty, setQty] = useState(1);
  const inCart = items.find((i) => i.productId === product.id);

  const outOfStock = !product.delivery_available || product.available_quantity <= 0;

  if (outOfStock) {
    return (
      <span className="inline-block text-xs text-gray-400 font-medium mt-2">
        Currently unavailable
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex items-center border border-gray-200 rounded-full">
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="px-2.5 py-1 text-gray-500"
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span className="px-1 text-sm w-6 text-center">{qty}</span>
        <button
          type="button"
          onClick={() => setQty((q) => q + 1)}
          className="px-2.5 py-1 text-gray-500"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
      <button
        type="button"
        onClick={() =>
          addItem({
            productId: product.id,
            name: product.name,
            unit: product.unit,
            netQuantity: product.net_quantity,
            price: product.selling_price,
            quantity: qty,
          })
        }
        className="flex-1 rounded-full bg-brand-600 text-white text-sm font-medium py-1.5 hover:bg-brand-700 transition"
      >
        {inCart ? `In Cart (${inCart.quantity})` : 'Add to Cart'}
      </button>
    </div>
  );
}
