'use client';

import {
  buildWhatsAppUrl,
  buildProductOrderMessage,
} from '@/lib/whatsapp-link';
import { WhatsAppIcon } from './WhatsAppFloatingButton';

export function ProductWhatsAppButton({
  name,
  price,
  quantity = 1,
}: {
  name: string;
  price: number;
  quantity?: number;
}) {
  const url = buildWhatsAppUrl(
    buildProductOrderMessage([
      {
        name,
        quantity,
        price,
      },
    ])
  );

  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Order ${name} on WhatsApp`}
      className="flex h-10 w-full min-w-0 items-center justify-center gap-2 overflow-hidden rounded-lg border border-[#25D366] bg-white px-3 text-sm font-semibold text-[#25D366] transition hover:bg-[#25D366]/5 active:bg-[#25D366]/10"
    >
      <WhatsAppIcon className="h-4 w-4 shrink-0" />

      <span className="truncate">
        Order on WhatsApp
      </span>
    </a>
  );
}