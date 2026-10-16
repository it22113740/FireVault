import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { publicImageUrl } from "@/lib/storage";
import { createPublicClient } from "@/lib/supabase/public";

// Posters are designed at this size; the page shows them in a 16:9 frame
export const UPDATE_IMAGE_SIZE = { width: 1920, height: 1080 } as const;

export type GameUpdate = { id: string; imageUrl: string; createdAt: string };

export async function getGameUpdates() {
  await connection();
  return getGameUpdatesCached();
}

async function getGameUpdatesCached(): Promise<GameUpdate[]> {
  "use cache";
  cacheTag(CACHE_TAGS.updates);
  cacheLife("hours");

  const { data, error } = await createPublicClient()
    .from("game_updates")
    .select("id, image_path, created_at")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw new Error(`Failed to load updates: ${error.message}`);
  return (data ?? []).map((row) => ({ id: row.id, imageUrl: publicImageUrl(row.image_path), createdAt: row.created_at }));
}
