/** Reads NEXT_PUBLIC_INSTAGRAM_URL. Returns null (hide the UI) if unset. */
export function getInstagramUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim();
  return url && url.startsWith('http') ? url : null;
}
