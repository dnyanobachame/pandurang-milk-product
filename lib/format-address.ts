/**
 * Formats a customer_addresses row for display, safely skipping any
 * field that's empty/null instead of producing things like
 * ". , Aanandwadi, Latur — 413531" when address_line is blank.
 */
export function formatAddress(
  address:
    | {
        address_line?: string | null;
        address_line_2?: string | null;
        landmark?: string | null;
        village_city?: string | null;
        taluka?: string | null;
        district?: string | null;
        state?: string | null;
        pin_code?: string | null;
      }
    | null
    | undefined
): string {
  if (!address) return '';

  const clean = (v: string | null | undefined) => (v ?? '').trim();

  const line1 = [address.address_line, address.address_line_2, address.landmark]
    .map(clean)
    .filter(Boolean)
    .join(', ');
  const line2 = [address.village_city, address.taluka].map(clean).filter(Boolean).join(', ');
  const region = [address.district, address.state].map(clean).filter(Boolean).join(', ');
  const line3 = [region, clean(address.pin_code)].filter(Boolean).join(' — ');

  return [line1, line2, line3].filter(Boolean).join(', ');
}
