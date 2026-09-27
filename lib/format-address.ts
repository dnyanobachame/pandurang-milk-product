/**
 * Formats a customer_addresses row for display, safely skipping any
 * field that's empty/null instead of producing things like
 * ". , Aanandwadi, Latur — 413531" when address_line is blank.
 */
export function formatAddress(address: {
  address_line?: string | null;
  village_city?: string | null;
  taluka?: string | null;
  district?: string | null;
  pin_code?: string | null;
  landmark?: string | null;
} | null | undefined): string {
  if (!address) return '';

  const line1 = [address.address_line, address.landmark].filter(Boolean).join(', ');
  const line2 = [address.village_city, address.taluka].filter(Boolean).join(', ');
  const line3 = [address.district, address.pin_code].filter(Boolean).join(' — ');

  return [line1, line2, line3].filter(Boolean).join(', ');
}
