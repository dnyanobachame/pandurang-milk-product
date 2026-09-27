import { createClient } from '@/lib/supabase/client';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export type ImageValidationError = { error: string };

export function validateProductImage(file: File): ImageValidationError | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { error: 'Only JPG, PNG, or WEBP images are allowed.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: 'Image must be smaller than 5 MB.' };
  }
  return null;
}

/** Strips everything but safe characters — never trust the original filename. */
function sanitizeFileStem(name: string): string {
  const stem = name.replace(/\.[^/.]+$/, ''); // drop extension
  return (
    stem
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'image'
  );
}

function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}

/**
 * Uploads a validated product image to the `product-images` bucket under
 * a server-safe, collision-proof path: products/{productId}/{timestamp}-{safe-name}.ext
 * `productId` must already be a real UUID (either an existing product's id,
 * or a freshly generated one for a new product) — never a client-supplied
 * arbitrary string — so a caller can't write outside its own product's
 * folder or attempt path traversal via the filename.
 */
export async function uploadProductImage(
  file: File,
  productId: string
): Promise<{ url: string } | { error: string }> {
  const validation = validateProductImage(file);
  if (validation) return validation;

  const supabase = createClient();
  const safeStem = sanitizeFileStem(file.name);
  const ext = extensionFor(file.type);
  const path = `products/${productId}/${Date.now()}-${safeStem}.${ext}`;

  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    return { error: 'Image upload failed. Please try again.' };
  }

  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  return { url: data.publicUrl };
}

/** Best-effort delete of a previous image — called only after the new
 * image has already uploaded successfully (see ProductFormModal). */
export async function deleteProductImageByUrl(url: string): Promise<void> {
  try {
    const marker = '/product-images/';
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const path = url.slice(idx + marker.length);
    const supabase = createClient();
    await supabase.storage.from('product-images').remove([path]);
  } catch {
    // Non-fatal — an orphaned old image is a minor storage-cost issue,
    // not worth failing the product save over.
  }
}
