/**
 * Displays a product's size without duplicating the number.
 *
 * Two conventions exist in this codebase: older/seeded products split
 * "500 ml" into unit="ml" + net_quantity=500; the admin Product Form
 * (added later) stores a single combined string like "500 ml" or "1 L"
 * directly in `unit` and leaves net_quantity unset. Naively rendering
 * `${net_quantity}${unit}` breaks the first convention when a value
 * accidentally has both set, and duplicates the number for the second.
 * This picks one representation instead of concatenating blindly.
 */
export function formatProductUnit(unit: string | null | undefined, netQuantity?: number | null): string {
  const u = (unit ?? '').trim();
  // unit already reads as a complete size ("500 ml", "1 L") — use as-is.
  if (/\d/.test(u)) return u;
  // unit is just the bare measure ("ml", "kg") — combine with quantity.
  if (netQuantity != null) return `${netQuantity} ${u}`.trim();
  return u;
}
