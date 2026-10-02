export function ProductPrice({
  price,
  mrp,
  size = 'md',
}: {
  price: number;
  mrp?: number | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const safePrice =
    Number.isFinite(price) && price >= 0
      ? price
      : 0;

  const safeMrp =
    mrp != null &&
    Number.isFinite(mrp) &&
    mrp > 0
      ? mrp
      : null;

  // Only show MRP/savings when the MRP is a valid
  // compare-at price greater than the selling price.
  const hasDiscount =
    safeMrp !== null && safeMrp > safePrice;

  const percentOff = hasDiscount
    ? Math.round(
        ((safeMrp - safePrice) / safeMrp) * 100
      )
    : 0;

  const priceClass =
    size === 'lg'
      ? 'text-2xl'
      : size === 'sm'
        ? 'text-sm'
        : 'text-base';

  const formattedPrice = safePrice.toLocaleString('en-IN');
  const formattedMrp = safeMrp?.toLocaleString('en-IN');

  return (
    <span
      className="inline-flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-0.5"
      aria-label={
        hasDiscount
          ? `Price ₹${formattedPrice}, MRP ₹${formattedMrp}, ${percentOff} percent off`
          : `Price ₹${formattedPrice}`
      }
    >
      <span
        className={`font-semibold text-brand-700 ${priceClass}`}
      >
        ₹{formattedPrice}
      </span>

      {hasDiscount && (
        <>
          <span
            className="text-sm text-gray-400 line-through"
            aria-hidden="true"
          >
            ₹{formattedMrp}
          </span>

          <span
            className="text-xs font-semibold text-green-700"
            aria-hidden="true"
          >
            {percentOff}% OFF
          </span>
        </>
      )}
    </span>
  );
}