'use client';

import { useCart } from '@/lib/cart-context';
import type { Product } from '@/lib/types';

/**
 * Purely an "add this quantity to cart" action now — quantity itself is
 * owned by the parent (see ProductOrderControls) so it can be shared
 * with the WhatsApp ordering button instead of each one tracking its own
 * separate state (which previously caused WhatsApp messages to always
 * say "Quantity: 1" regardless of what was selected on screen).
 */
export function AddToCartButton({ product, quantity }: { product: Product; quantity: number }) {
  const { addItem, items } = useCart();
  const inCart = items.find((i) => i.productId === product.id);

  return (
    <button
      type="button"
      onClick={() =>
        addItem({
          productId: product.id,
          name: product.name,
          unit: product.unit,
          netQuantity: product.net_quantity,
          price: product.selling_price,
          quantity,
        })
      }
      className="flex-1 rounded-full bg-brand-600 text-white text-sm font-medium py-1.5 hover:bg-brand-700 transition"
    >
      {inCart ? `In Cart (${inCart.quantity})` : 'Add to Cart'}
    </button>
  );
}
