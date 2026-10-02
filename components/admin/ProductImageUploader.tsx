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
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Product preview"
              className="h-full w-full object-cover"
            />

            {uploading ? (
              <div
                className="absolute inset-0 flex items-center justify-center bg-slate-950/45"
                aria-live="polite"
              >
                <div className="rounded-xl bg-white px-4 py-3 text-center shadow-lg">
                  <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-red-600" />
                  <p className="mt-2 text-xs font-semibold text-slate-700">
                    Uploading image…
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Replace image
            </button>
            <button
              type="button"
              onClick={() => {
                if (uploading) return;
                setPreview(null);
                setError(null);
                onUploaded('', '');
              }}
              disabled={uploading}
              className="min-h-[44px] rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Remove image
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`flex min-h-[190px] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
            dragOver
              ? 'border-red-500 bg-red-50'
              : 'border-slate-300 bg-slate-50/60 hover:border-slate-400 hover:bg-slate-50'
          } ${uploading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
          aria-label="Upload product image"
        >
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${
              dragOver ? 'bg-red-100 text-red-600' : 'bg-white text-slate-500 shadow-sm'
            }`}
            aria-hidden="true"
          >
            🖼️
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-800">
              {dragOver ? 'Drop image here' : 'Upload product image'}
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Drag &amp; drop or click to choose a file
            </span>
            <span className="mt-1 block text-[11px] text-slate-400">
              JPG, PNG or WEBP · Maximum 5 MB
            </span>
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />

      {uploading && !preview ? (
        <p className="mt-2 text-xs font-medium text-slate-500" aria-live="polite">
          Uploading image…
        </p>
      ) : null}

      {error ? (
        <p
          className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium leading-5 text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
