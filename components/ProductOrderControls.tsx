'use client';

import { useState } from 'react';
import type { Product } from '@/lib/types';
import { AddToCartButton } from './AddToCartButton';
import { ProductQuantitySelector } from './ProductQuantitySelector';
import { ProductWhatsAppButton } from './ProductWhatsAppButton';

/**
 * Single source of truth for "how many of this product does the
 * customer currently want" — shared by Add to Cart and the WhatsApp
 * ordering button, so both always agree with what's on screen.
 */
export function ProductOrderControls({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const outOfStock = !product.delivery_available || product.available_quantity <= 0;

  if (outOfStock) {
    return (
      <span className="inline-block text-xs text-gray-400 font-medium mt-2">
        Currently unavailable
      </span>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <ProductQuantitySelector
          quantity={quantity}
          onChange={setQuantity}
          maxQuantity={product.available_quantity}
        />
        <AddToCartButton product={product} quantity={quantity} />
      </div>
      <ProductWhatsAppButton name={product.name} price={product.selling_price} quantity={quantity} />
    </div>
  );
}
