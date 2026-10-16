import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { Enums, Views } from "@/lib/database.types";
import { publicImageUrl } from "@/lib/storage";
import { createPublicClient } from "@/lib/supabase/public";

// Public seller shops and their feedback. Same pattern as lib/store.ts:
// request-time (connection()) reads through a cache cleared by
// updateTag(CACHE_TAGS.sellers) whenever a shop or its feedback changes.

export type SellerSummary = {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  coverUrl: string;
  whatsappGroupUrl: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
  totalSold: number;
  likes: number;
  dislikes: number;
  ratingAvg: number | null;
  ratingCount: number;
  reviewCount: number;
  liveListings: number;
};

export type SellerReview = {
  id: string;
  customerId: string;
  reviewerName: string;
  reaction: Enums<"reaction"> | null;
  rating: number | null;
  comment: string | null;
  updatedAt: string;
};

function toSeller(row: Views<"seller_directory">): SellerSummary {
  return {
    id: row.id!,
    name: row.display_name!,
    slug: row.slug!,
    description: row.description ?? "",
    logoUrl: publicImageUrl(row.logo_path),
    coverUrl: publicImageUrl(row.cover_path),
    whatsappGroupUrl: row.whatsapp_group_url,
    tiktokUrl: row.tiktok_url,
    facebookUrl: row.facebook_url,
    totalSold: row.total_sold ?? 0,
    likes: row.likes ?? 0,
    dislikes: row.dislikes ?? 0,
    ratingAvg: row.rating_avg === null ? null : Number(row.rating_avg),
    ratingCount: row.rating_count ?? 0,
    reviewCount: row.review_count ?? 0,
    liveListings: row.live_listings ?? 0,
  };
}

export async function getSellers() {
  await connection();
  return getSellersCached();
}

async function getSellersCached() {
  "use cache";
  cacheTag(CACHE_TAGS.sellers, CACHE_TAGS.listings);
  cacheLife("hours");

  const { data, error } = await createPublicClient()
    .from("seller_directory")
    .select("*")
    .order("rating_avg", { ascending: false, nullsFirst: false })
    .order("likes", { ascending: false })
    .order("created_at");
  if (error) throw new Error(`Failed to load sellers: ${error.message}`);
  return (data ?? []).map(toSeller);
}

export async function getSellerBySlug(slug: string) {
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return null;
  await connection();
  return getSellerBySlugCached(slug);
}

async function getSellerBySlugCached(slug: string) {
  "use cache";
  cacheTag(CACHE_TAGS.sellers, CACHE_TAGS.listings);
  cacheLife("hours");

  const { data, error } = await createPublicClient()
    .from("seller_directory")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Failed to load seller: ${error.message}`);
  return data ? toSeller(data) : null;
}

// For the seller's own dashboard pages, which know their id, not their slug
export async function getSellerById(id: string) {
  await connection();
  return getSellerByIdCached(id);
}

async function getSellerByIdCached(id: string) {
  "use cache";
  cacheTag(CACHE_TAGS.sellers, CACHE_TAGS.listings);
  cacheLife("hours");

  const { data, error } = await createPublicClient()
    .from("seller_directory")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load seller: ${error.message}`);
  return data ? toSeller(data) : null;
}

export async function getSellerReviews(sellerId: string) {
  await connection();
  return getSellerReviewsCached(sellerId);
}

async function getSellerReviewsCached(sellerId: string): Promise<SellerReview[]> {
  "use cache";
  cacheTag(CACHE_TAGS.sellers);
  cacheLife("hours");

  const { data, error } = await createPublicClient()
    .from("seller_feedback")
    .select("id, customer_id, reviewer_name, reaction, rating, comment, updated_at")
    .eq("seller_id", sellerId)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Failed to load reviews: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    reviewerName: row.reviewer_name || "Customer",
    reaction: row.reaction,
    rating: row.rating,
    comment: row.comment,
    updatedAt: row.updated_at,
  }));
}
