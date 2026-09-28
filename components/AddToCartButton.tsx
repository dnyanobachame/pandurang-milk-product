'use client';

import { useCart } from '@/lib/cart-context';
import type { Product } from '@/lib/types';

export function AddToCartButton({
  product,
  quantity,
}: {
  product: Product;
  quantity: number;
}) {
  const { addItem, items } = useCart();

  const inCart = items.find(
    (item) => item.productId === product.id
  );

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
      className="flex h-10 w-full min-w-0 items-center justify-center overflow-hidden rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white transition hover:bg-brand-700 active:bg-brand-800"
    >
      <span className="truncate">
        {inCart
          ? `In Cart (${inCart.quantity})`
          : 'Add to Cart'}
      </span>
    </button>
  );
}