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

  const safeQuantity =
    Number.isFinite(quantity) && quantity > 0
      ? Math.floor(quantity)
      : 1;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      unit: product.unit,
      netQuantity: product.net_quantity,
      price: product.selling_price,
      quantity: safeQuantity,
    });
  };

  const buttonLabel = inCart
    ? `In Cart (${inCart.quantity})`
    : 'Add to Cart';

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      aria-label={
        inCart
          ? `${product.name} is in cart, quantity ${inCart.quantity}`
          : `Add ${product.name} to cart`
      }
      className="flex min-h-11 w-full min-w-0 items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 active:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="truncate">{buttonLabel}</span>
    </button>
  );
}