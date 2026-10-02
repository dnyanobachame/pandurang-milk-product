'use client';

export function ProductQuantitySelector({
  quantity,
  onChange,
  maxQuantity,
}: {
  quantity: number;
  onChange: (next: number) => void;
  maxQuantity: number;
}) {
  const safeMaxQuantity = Math.max(
    1,
    Math.floor(maxQuantity)
  );

  const safeQuantity = Math.min(
    Math.max(1, Math.floor(quantity)),
    safeMaxQuantity
  );

  const atMin = safeQuantity <= 1;
  const atMax = safeQuantity >= safeMaxQuantity;

  const decrease = () => {
    if (!atMin) {
      onChange(safeQuantity - 1);
    }
  };

  const increase = () => {
    if (!atMax) {
      onChange(safeQuantity + 1);
    }
  };

  return (
    <div
      className="flex h-12 w-full items-center justify-between overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm sm:w-[120px]"
      role="group"
      aria-label="Quantity"
    >
      <button
        type="button"
        onClick={decrease}
        disabled={atMin}
        aria-label="Decrease quantity"
        className="flex h-full w-12 shrink-0 items-center justify-center text-xl font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <span aria-hidden="true">−</span>
      </button>

      <span
        className="min-w-10 flex-1 select-none text-center text-base font-semibold tabular-nums text-gray-900"
        aria-live="polite"
        aria-label={`Quantity ${safeQuantity}`}
      >
        {safeQuantity}
      </span>

      <button
        type="button"
        onClick={increase}
        disabled={atMax}
        aria-label="Increase quantity"
        className="flex h-full w-12 shrink-0 items-center justify-center text-xl font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}