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
  const atMin = quantity <= 1;
  const atMax = quantity >= maxQuantity;

  return (
    <div
      className="flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-white sm:w-[112px]"
      role="group"
      aria-label="Quantity"
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(1, quantity - 1))}
        disabled={atMin}
        aria-label="Decrease quantity"
        className="flex h-full w-10 shrink-0 items-center justify-center rounded-l-lg text-lg font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
      >
        −
      </button>

      <span
        className="min-w-8 flex-1 text-center text-sm font-semibold text-gray-900"
        aria-live="polite"
      >
        {quantity}
      </span>

      <button
        type="button"
        onClick={() =>
          onChange(Math.min(maxQuantity, quantity + 1))
        }
        disabled={atMax}
        aria-label="Increase quantity"
        className="flex h-full w-10 shrink-0 items-center justify-center rounded-r-lg text-lg font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}