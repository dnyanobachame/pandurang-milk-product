export const PRODUCT_UNITS = [
  'ml',
  'L',
  'g',
  'kg',
  'Pack',
  'Piece',
] as const;

export type ProductUnit =
  (typeof PRODUCT_UNITS)[number];

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_IMAGE_BYTES =
  5 * 1024 * 1024; // 5 MB

/**
 * Builds a safe, collision-resistant
 * storage path for a product image.
 *
 * Original filename is never used directly.
 *
 * Images are stored under:
 *
 * products/{productId}/{timestamp}.{extension}
 */
export function buildProductImagePath(
  productId: string,
  mimeType: string
): string {
  const ext =
    mimeType === 'image/png'
      ? 'png'
      : mimeType === 'image/webp'
        ? 'webp'
        : 'jpg';

  const timestamp =
    Date.now();

  return `products/${productId}/${timestamp}.${ext}`;
}

export function isAllowedImageType(
  mimeType: string
): boolean {
  return (
    ALLOWED_IMAGE_TYPES as readonly string[]
  ).includes(mimeType);
}