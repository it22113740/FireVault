import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import type { Listing } from "@/src/lib/listings";
import { createPublicClient } from "@/src/lib/supabase/public";

// Anything that changes a listing must call updateTag(LISTINGS_TAG)
export const LISTINGS_TAG = "listings";

const PUBLIC_STATUSES = ["available", "reserved"];

export async function getStoreListings(): Promise<Listing[]> {
  "use cache";
  cacheTag(LISTINGS_TAG);
  cacheLife("hours");

  const { data, error } = await createPublicClient()
    .from("listings")
    .select("*")
    .in("status", PUBLIC_STATUSES)
    .order("created_at", { ascending: false });

  // Throw rather than return [] so a failed read is never cached
  if (error) throw new Error(`Failed to load listings: ${error.message}`);

  const listings = data as Listing[];
  // Available first, newest first within each group
  return [
    ...listings.filter((listing) => listing.status === "available"),
    ...listings.filter((listing) => listing.status !== "available"),
  ];
}

export async function getStoreListing(id: string): Promise<Listing | null> {
  if (!z.uuid().safeParse(id).success) return null;
  return getStoreListingById(id);
}

async function getStoreListingById(id: string): Promise<Listing | null> {
  "use cache";
  cacheTag(LISTINGS_TAG);
  cacheLife("hours");

  const { data, error } = await createPublicClient()
    .from("listings")
    .select("*")
    .eq("id", id)
    .in("status", PUBLIC_STATUSES)
    .maybeSingle();

  if (error) throw new Error(`Failed to load listing: ${error.message}`);
  return data as Listing | null;
}

export type StoreFilters = {
  minPrice?: number;
  maxPrice?: number;
  rank?: string;
  region?: string;
};

const optionalNumber = z.preprocess(
  (value) => (value === "" || value == null ? undefined : Number(value)),
  z.number().min(0).optional().catch(undefined)
);
const optionalText = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional()
  .catch(undefined);

const filtersSchema = z.object({
  min: optionalNumber,
  max: optionalNumber,
  rank: optionalText,
  region: optionalText,
});

// Invalid values are dropped rather than erroring, so a bad URL still renders
export function parseStoreFilters(
  searchParams: Record<string, string | string[] | undefined>
): StoreFilters {
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const { min, max, rank, region } = filtersSchema.parse({
    min: first(searchParams.min),
    max: first(searchParams.max),
    rank: first(searchParams.rank),
    region: first(searchParams.region),
  });
  return { minPrice: min, maxPrice: max, rank, region };
}

export function filterListings(listings: Listing[], filters: StoreFilters) {
  return listings.filter(
    (listing) =>
      (filters.minPrice === undefined || listing.price >= filters.minPrice) &&
      (filters.maxPrice === undefined || listing.price <= filters.maxPrice) &&
      (!filters.rank || listing.rank === filters.rank) &&
      (!filters.region || listing.region === filters.region)
  );
}

export function distinctValues(listings: Listing[], key: "rank" | "region") {
  const values = listings
    .map((listing) => listing[key])
    .filter((value): value is string => !!value);
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}
