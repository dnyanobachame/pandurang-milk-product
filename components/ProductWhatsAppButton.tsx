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
  const safeQuantity =
    Number.isFinite(quantity) && quantity > 0
      ? Math.floor(quantity)
      : 1;

  const safePrice =
    Number.isFinite(price) && price >= 0
      ? price
      : 0;

  const url = buildWhatsAppUrl(
    buildProductOrderMessage([
      {
        name,
        quantity: safeQuantity,
        price: safePrice,
      },
    ])
  );

  if (!url) {
    return null;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Order ${name} on WhatsApp`}
      className="flex min-h-11 w-full min-w-0 items-center justify-center gap-2 overflow-hidden rounded-lg border border-[#25D366] bg-white px-4 py-2.5 text-sm font-semibold text-[#25D366] transition-colors hover:bg-[#25D366]/5 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2 active:bg-[#25D366]/10"
    >
      <WhatsAppIcon
        className="h-5 w-5 shrink-0"
        aria-hidden="true"
      />

      <span className="truncate">
        Order on WhatsApp
      </span>
    </a>
  );
}