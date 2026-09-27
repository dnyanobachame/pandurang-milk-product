'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  buildProductImagePath,
  isAllowedImageType,
} from '@/lib/product-image-path';

export function ProductImageUploader({
  productId,
  currentImageUrl,
  onUploaded,
}: {
  /** Client-generated UUID for a new product, or the real id when editing. */
  productId: string;
  currentImageUrl: string | null;
  onUploaded: (url: string, path: string) => void;
}) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);

    if (!isAllowedImageType(file.type)) {
      setError('Please upload a JPG, PNG, or WEBP image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image must be 5 MB or smaller.');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const supabase = createClient();
    const path = buildProductImagePath(productId, file.type);

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: false, contentType: file.type });

    setUploading(false);

    if (uploadError) {
      setError('Image upload failed. Please try again.');
      return;
    }

    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    onUploaded(data.publicUrl, path);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      {preview ? (
        <div className="space-y-3">
          <div className="w-full aspect-video rounded-xl2 overflow-hidden border border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Product preview" className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium hover:bg-gray-50"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                onUploaded('', '');
              }}
              className="rounded-full border border-red-200 text-red-600 px-4 py-1.5 text-sm font-medium hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl2 py-10 px-4 cursor-pointer text-center transition-colors ${
            dragOver ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          <p className="text-sm font-medium text-gray-700">Drag &amp; Drop Product Image</p>
          <p className="text-xs text-gray-500">or click to choose a file — JPG, PNG or WEBP, up to 5 MB</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />

      {uploading && <p className="text-xs text-gray-500 mt-2">Uploading…</p>}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
