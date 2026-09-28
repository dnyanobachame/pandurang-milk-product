'use client';

export function ProductQuantitySelector({
  quantity,
  onChange,
  maxQuantity,
}: {
  quantity: number;
  onChange: (next: number) => void;
  /** Available stock — the selector refuses to go higher than this. */
  maxQuantity: number;
}) {
  const atMin = quantity <= 1;
  const atMax = quantity >= maxQuantity;

  return (
    <div className="inline-flex items-center border border-gray-200 rounded-full" role="group" aria-label="Quantity">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, quantity - 1))}
        disabled={atMin}
        aria-label="Decrease quantity"
        className="px-2.5 py-1 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        −
      </button>
      <span className="px-1 text-sm w-6 text-center" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(maxQuantity, quantity + 1))}
        disabled={atMax}
        aria-label="Increase quantity"
        className="px-2.5 py-1 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        +
      </button>
    </div>
  );
}
