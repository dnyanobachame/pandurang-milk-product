/** "Fresh Cow Milk 1 L" -> "fresh-cow-milk-1-l" */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Appends -2, -3, ... until `candidate` isn't in `existingSlugs`.
 * Pass every other product's slug (minus the one being edited, if any).
 */
export function uniqueSlug(base: string, existingSlugs: Set<string>): string {
  if (!existingSlugs.has(base)) return base;
  let n = 2;
  while (existingSlugs.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
