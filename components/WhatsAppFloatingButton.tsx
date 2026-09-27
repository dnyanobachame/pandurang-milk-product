'use client';

import { buildWhatsAppUrl, WHATSAPP_GENERAL_MESSAGE } from '@/lib/whatsapp-link';

export function WhatsAppFloatingButton() {
  const url = buildWhatsAppUrl(WHATSAPP_GENERAL_MESSAGE);
  if (!url) return null; // no NEXT_PUBLIC_WHATSAPP_NUMBER configured yet

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Pandurang Milk Product on WhatsApp"
      // Hidden on mobile — the bottom nav's WhatsApp tab covers this role
      // there, so a floating button would otherwise sit on top of it.
      className="hidden md:flex fixed bottom-6 right-6 z-40 items-center gap-2 bg-[#25D366] text-white rounded-full pl-4 pr-5 py-3 shadow-lg hover:brightness-95 transition"
    >
      <WhatsAppIcon className="w-5 h-5" />
      <span className="text-sm font-medium">WhatsApp</span>
    </a>
  );
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.51 2 12.04 2Zm0 18.02h-.01a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.14.82.84-3.06-.19-.31a8.11 8.11 0 0 1-1.24-4.25c0-4.49 3.65-8.14 8.14-8.14 2.17 0 4.21.85 5.75 2.39a8.08 8.08 0 0 1 2.38 5.76c0 4.49-3.66 8.1-8.1 8.1Zm4.45-6.07c-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.35-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.42-.55-.42h-.47c-.16 0-.42.06-.64.3s-.85.83-.85 2.03.87 2.36.99 2.52c.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.43-.58 1.63-1.15.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}
