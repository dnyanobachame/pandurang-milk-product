'use client';

import { createWhatsAppInquiryLink } from '@/lib/whatsapp-link';

const instagramUrl =
  process.env.NEXT_PUBLIC_INSTAGRAM_URL ||
  'https://www.instagram.com/kartik_sagar_322/';

export function ContactFloat() {
  const whatsappLink = createWhatsAppInquiryLink();

  return (
    <>
      {/* Floating social/contact buttons */}
      <div className="fixed bottom-5 right-4 z-40 flex flex-col items-end gap-3">
        {/* Instagram */}
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Follow Mauli Milk and Products on Instagram"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-gray-200 shadow-lg text-pink-600 transition-transform hover:scale-105"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
          </svg>
        </a>

        {/* WhatsApp */}
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contact Mauli Milk and Products on WhatsApp"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-xl transition-transform hover:scale-105 hover:bg-green-600"
        >
          <svg
            width="27"
            height="27"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M20.5 3.5A11.9 11.9 0 0 0 12.05 0C5.5 0 .17 5.32.17 11.88c0 2.1.55 4.15 1.6 5.96L.08 24l6.3-1.65a11.86 11.86 0 0 0 5.66 1.44h.01c6.55 0 11.87-5.33 11.87-11.88 0-3.17-1.23-6.15-3.42-8.41ZM12.05 21.8h-.01a9.9 9.9 0 0 1-5.05-1.38l-.36-.21-3.74.98 1-3.64-.23-.37a9.88 9.88 0 0 1-1.52-5.3C2.14 6.4 6.58 1.98 12.06 1.98c2.65 0 5.14 1.03 7.01 2.9a9.86 9.86 0 0 1 2.9 7.03c-.01 5.47-4.46 9.89-9.92 9.89Zm5.43-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.21 5.09 4.5.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
          </svg>
        </a>
      </div>
    </>
  );
}