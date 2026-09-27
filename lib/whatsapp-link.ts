export function getWhatsAppNumber(): string {
  return (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D/g, "");
}

export function createWhatsAppLink(message: string): string {
  const number = getWhatsAppNumber();

  if (!number) {
    return "#";
  }

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function createProductWhatsAppLink({
  productName,
  sku,
  price,
  quantity = 1,
}: {
  productName: string;
  sku?: string | null;
  price?: number | null;
  quantity?: number;
}): string {
  const total =
    typeof price === "number" ? (price * quantity).toFixed(2) : null;

  const lines = [
    "Hello Mauli Milk and Products 👋",
    "",
    "I want to order:",
    `Product: ${productName}`,
    sku ? `SKU: ${sku}` : null,
    typeof price === "number" ? `Price: ₹${price.toFixed(2)}` : null,
    `Quantity: ${quantity}`,
    total ? `Estimated Total: ₹${total}` : null,
    "",
    "Please confirm availability and delivery details.",
  ].filter(Boolean);

  return createWhatsAppLink(lines.join("\n"));
}

export function createWhatsAppInquiryLink(): string {
  return createWhatsAppLink(
    "Hello Mauli Milk and Products 👋\n\nI would like to know more about your products and services."
  );
}
