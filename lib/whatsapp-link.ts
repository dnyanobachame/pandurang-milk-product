/**
 * Reads NEXT_PUBLIC_WHATSAPP_NUMBER, e.g. "919999999999".
 * No "+", spaces, or punctuation.
 */
export function getWhatsAppNumber(): string | null {
  const n = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim();
  return n && /^\d{10,15}$/.test(n) ? n : null;
}

export function buildWhatsAppUrl(message: string): string | null {
  const number = getWhatsAppNumber();
  if (!number) return null;

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export const WHATSAPP_GENERAL_MESSAGE = `Hello Pandurang Milk Product 👋

I need information about your milk products,
prices and delivery service.

Please help me.`;

export function buildProductOrderMessage(
  items: { name: string; quantity: number; price: number }[]
): string {
  if (items.length === 1) {
    const [item] = items;
    const total = item.quantity * item.price;

    return `Hello Pandurang Milk Product 👋

I want to order:

Product: ${item.name}
Quantity: ${item.quantity}
Price: ₹${item.price} each
Total: ₹${total}

Please confirm availability and delivery.`;
  }

  const lines = items.map(
    (item, i) =>
      `${i + 1}. ${item.name} × ${item.quantity} = ₹${
        item.quantity * item.price
      }`
  );

  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  return `Hello Pandurang Milk Product 👋

I want to place an order:

${lines.join("\n")}

Total: ₹${total}

Please confirm availability and delivery.`;
}

/**
 * Existing AddToCartButton compatibility helper.
 */
export function createProductWhatsAppLink(product: {
  productName: string;
  price: number;
  quantity?: number;
  sku?: string;
}): string | undefined {
  const quantity = product.quantity ?? 1;

  const message = buildProductOrderMessage([
    {
      name: product.productName,
      price: product.price,
      quantity,
    },
  ]);

  return buildWhatsAppUrl(message) ?? undefined;
}

/**
 * Existing ContactFloat/Footer compatibility helper.
 */
export function createWhatsAppInquiryLink(
  message: string = WHATSAPP_GENERAL_MESSAGE
): string | undefined {
  return buildWhatsAppUrl(message) ?? undefined;
}
