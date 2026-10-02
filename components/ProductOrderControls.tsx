'use client';

import { useState } from 'react';
import type { Product } from '@/lib/types';
import { AddToCartButton } from './AddToCartButton';
import { ProductQuantitySelector } from './ProductQuantitySelector';
import { ProductWhatsAppButton } from './ProductWhatsAppButton';

/**
 * Product ordering controls.
 *
 * The selected quantity is shared between Add to Cart and WhatsApp
 * so both actions always use the same quantity shown to the customer.
 */
export function ProductOrderControls({
  product,
}: {
  product: Product;
}) {
  const [quantity, setQuantity] = useState(1);

  const outOfStock =
    !product.delivery_available ||
    product.available_quantity <= 0;

  if (outOfStock) {
    return (
      <div
        className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-center"
        role="status"
        aria-label={`${product.name} is currently unavailable`}
      >
        <span className="text-sm font-medium text-gray-500">
          Currently unavailable
        </span>
      </div>
    );
  }

  const maxQuantity = Math.max(
    1,
    Math.floor(product.available_quantity)
  );

  const safeQuantity = Math.min(
    Math.max(1, Math.floor(quantity)),
    maxQuantity
  );

  const handleQuantityChange = (nextQuantity: number) => {
    if (!Number.isFinite(nextQuantity)) {
      return;
    }

    const normalizedQuantity = Math.min(
      Math.max(1, Math.floor(nextQuantity)),
      maxQuantity
    );

    setQuantity(normalizedQuantity);
  };

  return (
    <div className="w-full min-w-0">
      {/* Quantity + Add to Cart */}
      <div className="flex w-full min-w-0 flex-col gap-2.5 sm:flex-row sm:items-stretch">
        {/* Quantity selector */}
        <div className="w-full shrink-0 sm:w-auto">
          <ProductQuantitySelector
            quantity={safeQuantity}
            onChange={handleQuantityChange}
            maxQuantity={maxQuantity}
          />
        </div>

        {/* Add to cart */}
        <div className="min-w-0 flex-1">
          <AddToCartButton
            product={product}
            quantity={safeQuantity}
          />
        </div>
      </div>

      {/* WhatsApp ordering */}
      <div className="mt-2.5 w-full min-w-0">
        <ProductWhatsAppButton
          name={product.name}
          price={product.selling_price}
          quantity={safeQuantity}
        />
      </div>
    </div>
  );
}