export function StockBadge({
  availableQuantity,
  lowStockThreshold = 10,
}: {
  availableQuantity: number;
  lowStockThreshold?: number;
}) {
  const safeQuantity =
    Number.isFinite(availableQuantity)
      ? Math.max(0, Math.floor(availableQuantity))
      : 0;

  const safeThreshold =
    Number.isFinite(lowStockThreshold)
      ? Math.max(0, Math.floor(lowStockThreshold))
      : 10;

  if (safeQuantity <= 0) {
    return (
      <p
        className="mt-1 text-xs font-medium text-gray-500"
        role="status"
      >
        Currently unavailable — available again soon
      </p>
    );
  }

  if (safeQuantity <= safeThreshold) {
    return (
      <p
        className="mt-1 text-xs font-medium text-amber-600"
        role="status"
      >
        Only {safeQuantity} left
      </p>
    );
  }

  return (
    <p
      className="mt-1 text-xs font-medium text-green-700"
      role="status"
    >
      <span aria-hidden="true">✓ </span>
      Available Today
    </p>
  );
}