import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { createPublicClient } from "@/lib/supabase/public";

export async function getIdCollegeSamples() {
  await connection();
  return getCached();
}

async function getCached() {
  "use cache";
  cacheTag(CACHE_TAGS.settings);
  cacheLife("hours");
  const { data, error } = await createPublicClient().from("id_college_samples").select("*").order("slot");
  if (error) throw new Error(`Failed to load ID College samples: ${error.message}`);
  return data ?? [];
}
