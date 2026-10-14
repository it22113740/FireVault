import { formatPrice, shortId } from "@/lib/format";

// Pre-filled WhatsApp text (PLAN.md "The WhatsApp button")
export function listingMessage(listing: { id: string; title: string; price: number }, currency: string) {
  return `Hi, I'm interested in the Free Fire account '${listing.title}' (ID: ${shortId(listing.id)}) — ${formatPrice(listing.price, currency)}. Is it available?`;
}

export function topupMessage(topup: { name: string; price: number }, currency: string) {
  return `Hi, I'd like to buy the top-up '${topup.name}' — ${formatPrice(topup.price, currency)}. Is it available?`;
}
