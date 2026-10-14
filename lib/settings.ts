import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { Tables } from "@/lib/database.types";
import { createPublicClient } from "@/lib/supabase/public";

export type AppSettings = Tables<"app_settings">;

// Public data is read at request time (connection()) and cached on the server,
// so `next build` never needs the database and pages stream behind skeletons.
export async function getSettings(): Promise<AppSettings> {
  await connection();
  return getSettingsCached();
}

async function getSettingsCached(): Promise<AppSettings> {
  "use cache";
  cacheTag(CACHE_TAGS.settings);
  cacheLife("hours");

  const { data, error } = await createPublicClient()
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .single();
  // Throw so a failed read is never cached
  if (error) throw new Error(`Failed to load settings: ${error.message}`);
  return data;
}
