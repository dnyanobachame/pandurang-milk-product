export function ProductPrice({
  price,
  mrp,
  size = 'md',
}: {
  price: number;
  mrp?: number | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  // Never fabricate a discount — only show MRP/savings when it's a real,
  // valid compare-at price.
  const hasDiscount = mrp != null && mrp > price;
  const percentOff = hasDiscount ? Math.round(((mrp! - price) / mrp!) * 100) : 0;

  const priceClass = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <span className="inline-flex items-baseline gap-2">
      <span className={`font-semibold text-brand-700 ${priceClass}`}>₹{price}</span>
      {hasDiscount && (
        <>
          <span className="text-gray-400 line-through text-sm">₹{mrp}</span>
          <span className="text-green-700 text-xs font-medium">{percentOff}% OFF</span>
        </>
      )}
    </span>
  );
}
