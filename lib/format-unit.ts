export function formatProductUnit(
  unit: string | null | undefined,
  netQuantity?: number | null
): string {
  const cleanUnit = String(unit ?? '').trim();

  if (!cleanUnit) {
    return '';
  }

  if (
    netQuantity !== null &&
    netQuantity !== undefined &&
    Number.isFinite(Number(netQuantity))
  ) {
    return `${Number(netQuantity)} ${cleanUnit}`;
  }

  return cleanUnit;
}