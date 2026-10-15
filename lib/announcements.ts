import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { createPublicClient } from "@/lib/supabase/public";

export async function getPublishedAnnouncements() {
  await connection();
  return getCachedAnnouncements();
}

async function getCachedAnnouncements() {
  "use cache";
  cacheTag(CACHE_TAGS.announcements);
  cacheLife("hours");
  const { data, error } = await createPublicClient().from("announcements")
    .select("id, title, image_path").eq("published", true)
    .order("created_at", { ascending: false }).order("id");
  if (error) throw new Error(`Failed to load announcements: ${error.message}`);
  return data ?? [];
}
