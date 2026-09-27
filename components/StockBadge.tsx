export function StockBadge({
  availableQuantity,
  lowStockThreshold = 10,
}: {
  availableQuantity: number;
  lowStockThreshold?: number;
}) {
  if (availableQuantity <= 0) {
    return (
      <p className="text-xs text-gray-400 mt-1">
        Currently unavailable — available again soon
      </p>
    );
  }
  if (availableQuantity <= lowStockThreshold) {
    return <p className="text-xs text-amber-600 mt-1">Only {availableQuantity} left</p>;
  }
  return <p className="text-xs text-green-700 mt-1">✓ Available Today</p>;
}
