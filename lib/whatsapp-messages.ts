import { formatPrice, shortId } from "@/lib/format";

// Pre-filled WhatsApp text (PLAN.md "The WhatsApp button")
export function listingMessage(listing: { id: string; title: string; price: number }, currency: string) {
  return `Hi, I'm interested in the Free Fire account '${listing.title}' (ID: ${shortId(listing.id)}) — ${formatPrice(listing.price, currency)}. Is it available?`;
}

export function sellerMessage(shopName: string) {
  return `Hi ${shopName}, I found your shop on FireVault and I'd like to ask about your accounts.`;
}

export function topupMessage(topup: { name: string; price: number }, currency: string) {
  return `Hi, I'd like to buy the top-up '${topup.name}' — ${formatPrice(topup.price, currency)}. Is it available?`;
}

// Sent by the customer from the "Order placed" screen, so the admin gets the
// order and a link to the proof of payment in one chat
export function topupOrderMessage(order: {
  id: string;
  item: string;
  total: string;
  paymentMethod: string;
  playerUid: string;
  whatsappNumber: string;
  customerName: string | null;
  proofUrl: string;
}) {
  return [
    "Hi, I placed a top-up order on FireVault.",
    "",
    `Order: ${shortId(order.id)}`,
    `Item: ${order.item}`,
    `Total: ${order.total}`,
    `Paid by: ${order.paymentMethod}`,
    `Player UID: ${order.playerUid}`,
    ...(order.customerName ? [`Name: ${order.customerName}`] : []),
    `My WhatsApp: ${order.whatsappNumber}`,
    "",
    `Payment proof: ${order.proofUrl}`,
  ].join("\n");
}
