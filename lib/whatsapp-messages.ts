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
