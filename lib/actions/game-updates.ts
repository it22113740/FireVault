"use server";

import { refresh, updateTag } from "next/cache";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { logAudit } from "@/lib/audit";
import { requireSuperAdmin } from "@/lib/auth";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { UPDATE_IMAGE_SIZE } from "@/lib/game-updates";
import { stagedToWebp } from "@/lib/images";
import { PUBLIC_IMAGES_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validations/common";

// Image only: the browser stages the original (up to 30 MB), this converts it
export async function createGameUpdate(formData: FormData): Promise<ActionResult> {
  const profile = await requireSuperAdmin();
  const image = await stagedToWebp(formData.get("stagedImage"), profile.id, {
    folder: "updates",
    maxWidth: UPDATE_IMAGE_SIZE.width,
  });
  if ("error" in image) return fail(image.error);

  const supabase = await createClient();
  const storage = supabase.storage.from(PUBLIC_IMAGES_BUCKET);
  const { error: uploadError } = await storage.upload(image.path, image.body, {
    contentType: "image/webp",
    cacheControl: "31536000",
  });
  if (uploadError) return fail("Couldn't upload the image. Please try again.");

  const { data, error } = await supabase.from("game_updates").insert({ image_path: image.path }).select("id").single();
  if (error || !data) {
    await storage.remove([image.path]);
    return fail("Couldn't save the update. Please try again.");
  }

  await logAudit(profile.id, "update.create", data.id);
  updateTag(CACHE_TAGS.updates);
  refresh();
  return ok();
}

export async function deleteGameUpdate(id: string): Promise<ActionResult> {
  const profile = await requireSuperAdmin();
  if (!uuidSchema.safeParse(id).success) return fail("Update not found.");

  const supabase = await createClient();
  const { data, error } = await supabase.from("game_updates").delete().eq("id", id).select("image_path").maybeSingle();
  if (error || !data) return fail("Couldn't delete the update.");

  await supabase.storage.from(PUBLIC_IMAGES_BUCKET).remove([data.image_path]);
  await logAudit(profile.id, "update.delete", id);
  updateTag(CACHE_TAGS.updates);
  refresh();
  return ok();
}
