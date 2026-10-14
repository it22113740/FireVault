export const LISTING_STATUSES = ["available", "reserved", "sold", "archived"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

// Statuses an admin may set by hand; reserved/sold are driven by orders
export const EDITABLE_LISTING_STATUSES = ["available", "archived"] as const;

export type Listing = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  level: number | null;
  rank: string | null;
  region: string | null;
  highlights: string[];
  images: string[];
  status: ListingStatus;
  created_at: string;
};

export const LISTING_IMAGES_BUCKET = "listing-images";
export const MAX_LISTING_IMAGES = 10;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Matches the URL supabase-js builds in storage.getPublicUrl()
export const LISTING_IMAGE_URL_PREFIX = new URL(
  `storage/v1/object/public/${LISTING_IMAGES_BUCKET}/`,
  process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/?$/, "/")
).href;

export function listingImagePath(url: string) {
  return url.slice(LISTING_IMAGE_URL_PREFIX.length);
}

const priceFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function formatPrice(price: number) {
  return priceFormat.format(price);
}
