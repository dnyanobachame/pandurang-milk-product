'use client';

import { buildWhatsAppUrl, buildProductOrderMessage } from '@/lib/whatsapp-link';
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
  const url = buildWhatsAppUrl(buildProductOrderMessage([{ name, quantity, price }]));
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Order ${name} on WhatsApp`}
      className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-full border border-[#25D366] text-[#25D366] text-xs font-medium py-1.5 hover:bg-[#25D366]/5"
    >
      <WhatsAppIcon className="w-3.5 h-3.5" />
      Order on WhatsApp
    </a>
  );
}
