import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { z } from "zod";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { Availability } from "@/lib/listings";
import { publicImageUrl } from "@/lib/storage";
import { createPublicClient } from "@/lib/supabase/public";
import type { TopupCategory } from "@/lib/topups";

// Public storefront reads. Each getter waits for the request (connection())
// so builds never hit the database, then reads through a server-side cache
// that admin mutations clear with updateTag().

export const PAGE_SIZE = 12;

export type PublicListing = {
  id: string;
  title: string;
  description: string;
  price: number;
  region: string;
  imageUrl: string;
  availability: Availability;
  // Seller is open to swapping for another account
  exchangeAvailable: boolean;
  publishedAt: string | null;
  whatsappNumber: string | null;
  // The seller's shop; null for the super admin's own listings
  seller: { name: string; slug: string; logoUrl: string } | null;
};

export type PublicTopup = {
  id: string;
  category: TopupCategory;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
};

const SORTS = ["newest", "price_asc", "price_desc"] as const;
export type ListingSort = (typeof SORTS)[number];

const optionalNumber = z.preprocess(
  (value) => (value === "" || value == null ? undefined : Number(value)),
  z.number().min(0).optional().catch(undefined)
);

const filtersSchema = z.object({
  region: z.string().trim().max(20).optional().catch(undefined),
  min: optionalNumber,
  max: optionalNumber,
  availability: z.enum(["available", "reserved"]).optional().catch(undefined),
  exchange: z.literal("1").optional().catch(undefined),
  sort: z.enum(SORTS).default("newest").catch("newest"),
  page: z.coerce.number().int().min(1).default(1).catch(1),
});
export type ListingFilters = z.output<typeof filtersSchema>;

// Bad values in the URL are dropped, never an error page
export function parseListingFilters(params: Record<string, string | string[] | undefined>) {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  return filtersSchema.parse({
    region: first(params.region) || undefined,
    min: first(params.min),
    max: first(params.max),
    availability: first(params.availability),
    exchange: first(params.exchange),
    sort: first(params.sort),
    page: first(params.page),
  });
}

type ViewRow = {
  id: string | null;
  title: string | null;
  description: string | null;
  price: number | null;
  region: string | null;
  image_path: string | null;
  availability: Availability | null;
  exchange_available: boolean | null;
  published_at: string | null;
  whatsapp_number: string | null;
  seller_name: string | null;
  seller_slug: string | null;
  seller_logo_path: string | null;
};

function toPublicListing(row: ViewRow): PublicListing {
  return {
    id: row.id!,
    title: row.title!,
    description: row.description ?? "",
    price: row.price ?? 0,
    region: row.region ?? "",
    imageUrl: publicImageUrl(row.image_path),
    availability: row.availability ?? "available",
    exchangeAvailable: row.exchange_available ?? false,
    publishedAt: row.published_at,
    whatsappNumber: row.whatsapp_number || null,
    seller:
      row.seller_slug && row.seller_name
        ? { name: row.seller_name, slug: row.seller_slug, logoUrl: publicImageUrl(row.seller_logo_path) }
        : null,
  };
}

export async function getPublishedListings(filters: ListingFilters) {
  await connection();
  return getPublishedListingsCached(filters);
}

async function getPublishedListingsCached(filters: ListingFilters) {
  "use cache";
  cacheTag(CACHE_TAGS.listings);
  cacheLife("hours");

  let query = createPublicClient().from("published_listings").select("*", { count: "exact" });
  if (filters.region) query = query.eq("region", filters.region);
  if (filters.availability) query = query.eq("availability", filters.availability);
  if (filters.exchange) query = query.eq("exchange_available", true);
  if (filters.min !== undefined) query = query.gte("price", filters.min);
  if (filters.max !== undefined) query = query.lte("price", filters.max);

  query =
    filters.sort === "newest"
      ? query.order("published_at", { ascending: false })
      : query.order("price", { ascending: filters.sort === "price_asc" });

  const from = (filters.page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.order("id").range(from, from + PAGE_SIZE - 1);
  // A page past the end makes PostgREST return 416; treat it as empty
  if (error && error.code !== "PGRST103") throw new Error(`Failed to load listings: ${error.message}`);

  return { listings: (data ?? []).map(toPublicListing), total: count ?? 0 };
}

// Home page: every seller's newest available account, newest first (the
// super admin's own listings count as one seller)
export async function getLatestListingPerSeller(limit = 24) {
  await connection();
  return getLatestListingPerSellerCached(limit);
}

async function getLatestListingPerSellerCached(limit: number) {
  "use cache";
  cacheTag(CACHE_TAGS.listings);
  cacheLife("hours");

  const { data, error } = await createPublicClient()
    .from("latest_listing_per_seller")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load listings: ${error.message}`);
  return (data ?? []).map(toPublicListing);
}

export async function getSellerListings(sellerId: string) {
  await connection();
  return getSellerListingsCached(sellerId);
}

async function getSellerListingsCached(sellerId: string) {
  "use cache";
  cacheTag(CACHE_TAGS.listings);
  cacheLife("hours");

  const { data, error } = await createPublicClient()
    .from("published_listings")
    .select("*")
    .eq("seller_id", sellerId)
    .order("availability")
    .order("published_at", { ascending: false })
    .limit(48);
  if (error) throw new Error(`Failed to load listings: ${error.message}`);
  return (data ?? []).map(toPublicListing);
}

export async function getPublishedListing(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  await connection();
  return getPublishedListingCached(id);
}

async function getPublishedListingCached(id: string) {
  "use cache";
  cacheTag(CACHE_TAGS.listings);
  cacheLife("hours");

  const { data, error } = await createPublicClient()
    .from("published_listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load listing: ${error.message}`);
  return data ? toPublicListing(data) : null;
}

export async function getPublishedTopups() {
  await connection();
  return getPublishedTopupsCached();
}

async function getPublishedTopupsCached(): Promise<PublicTopup[]> {
  "use cache";
  cacheTag(CACHE_TAGS.topups);
  cacheLife("hours");

  const { data, error } = await createPublicClient()
    .from("topups")
    .select("id, category, name, description, price, image_path")
    .eq("status", "published")
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error(`Failed to load top-ups: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    name: row.name,
    description: row.description,
    price: row.price,
    imageUrl: publicImageUrl(row.image_path),
  }));
}
