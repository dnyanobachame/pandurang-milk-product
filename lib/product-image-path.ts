export const PRODUCT_UNITS = [
  '100 ml', '200 ml', '250 ml', '500 ml', '1 L', '2 L', '5 L', '10 L',
  '100 g', '250 g', '500 g', '1 kg', 'Pack', 'Piece',
] as const;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Builds a safe, collision-resistant storage path for a product image.
 * Never uses the original filename directly — only its (validated)
 * extension — so there's no path-traversal or weird-character risk from
 * user-supplied filenames.
 *
 * Also enforced server-side by the `product_images_staff_insert` storage
 * policy, which requires every uploaded object to live under `products/`.
 */
export function buildProductImagePath(productId: string, mimeType: string): string {
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const timestamp = Date.now();
  return `products/${productId}/${timestamp}.${ext}`;
}

export function isAllowedImageType(mimeType: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType);
}
