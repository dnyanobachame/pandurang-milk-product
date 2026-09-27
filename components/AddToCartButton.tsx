'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart-context';
import { createProductWhatsAppLink } from '@/lib/whatsapp-link';
import type { Product } from '@/lib/types';

export function AddToCartButton({ product }: { product: Product }) {
  const { addItem, items } = useCart();
  const [qty, setQty] = useState(1);
  const inCart = items.find((i) => i.productId === product.id);

  const outOfStock =
    !product.delivery_available || product.available_quantity <= 0;

  if (outOfStock) {
    return (
      <span className="inline-block text-xs text-gray-400 font-medium mt-2">
        Currently unavailable
      </span>
    );
  }

  const whatsappLink = createProductWhatsAppLink({
    productName: product.name,
    sku: product.sku,
    price: product.selling_price,
    quantity: qty,
  });

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center border border-gray-200 rounded-full">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="px-2.5 py-1 text-gray-500 hover:text-gray-800"
            aria-label="Decrease quantity"
          >
            −
          </button>

          <span className="px-1 text-sm w-6 text-center">
            {qty}
          </span>

          <button
            type="button"
            onClick={() =>
              setQty((q) =>
                Math.min(q + 1, product.available_quantity)
              )
            }
            className="px-2.5 py-1 text-gray-500 hover:text-gray-800"
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

      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full rounded-full border border-green-200 bg-green-50 text-green-700 text-sm font-medium py-1.5 hover:bg-green-100 transition"
        aria-label={`Order ${product.name} on WhatsApp`}
      >
        <span aria-hidden="true">💬</span>
        Order on WhatsApp
      </a>
    </div>
  );
}
