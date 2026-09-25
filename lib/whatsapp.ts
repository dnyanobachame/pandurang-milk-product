/**
 * Thin wrapper around the WhatsApp Business Cloud API (Meta) — the most
 * common self-serve option, hence the default request shape below. If
 * WHATSAPP_PROVIDER is a BSP (Gupshup, Twilio, etc.) instead, swap the
 * fetch call in sendWhatsAppMessage() for that provider's API; everything
 * calling this module (opt-in checks, message logging, retry-safety) stays
 * the same.
 *
 * This module is server-only — it uses WHATSAPP_ACCESS_TOKEN, which must
 * never reach the client bundle. Only import it from Server Actions or
 * Route Handlers.
 */

type SendResult = { ok: true; providerMessageId: string } | { ok: false; error: string };

const WHATSAPP_CONFIGURED = Boolean(
  process.env.WHATSAPP_API_URL && process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
);

/**
 * Sends a freeform text message. WhatsApp Business API technically requires
 * a pre-approved template outside the 24-hour customer-service window —
 * swap this for a `template` payload (with template name + params) once
 * your templates are approved in Meta Business Manager. Kept as freeform
 * text here so the integration is runnable/testable without waiting on
 * template approval first.
 */
export async function sendWhatsAppMessage(toMobile: string, body: string): Promise<SendResult> {
  if (!WHATSAPP_CONFIGURED) {
    return { ok: false, error: 'WhatsApp is not configured (missing environment variables).' };
  }

  const url = `${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toMobile.replace(/[^\d+]/g, ''),
        type: 'text',
        text: { body },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: data?.error?.message ?? `WhatsApp API returned ${res.status}` };
    }

    return { ok: true, providerMessageId: data?.messages?.[0]?.id ?? 'unknown' };
  } catch {
    return { ok: false, error: 'Could not reach the WhatsApp API.' };
  }
}

export const WHATSAPP_TEMPLATES = {
  orderConfirmed: (orderNumber: string, total: number) =>
    `🙏 Pandurang Milk Product\n\nOrder #${orderNumber} confirmed.\n\nTotal: ₹${total}\n\nYour order is being prepared.`,
  packed: (orderNumber: string) =>
    `Your Pandurang Milk order #${orderNumber} has been packed.`,
  outForDelivery: (orderNumber: string, total: number) =>
    `🚚 Your order #${orderNumber} is out for delivery.\n\nAmount: ₹${total}`,
  delivered: (orderNumber: string) =>
    `✅ Your order #${orderNumber} has been delivered.\n\nThank you for choosing Pandurang Milk Product.`,
  paymentReminder: (orderNumber: string, total: number) =>
    `Payment pending for order #${orderNumber}.\n\nAmount: ₹${total}`,
} as const;
