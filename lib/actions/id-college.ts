"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { stagedToWebp } from "@/lib/images";
import { PUBLIC_IMAGES_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export async function saveIdCollegeSample(form: FormData): Promise<ActionResult> {
  const actor = await requireSuperAdmin();
  const parsed = z.object({
    slot: z.coerce.number().int().min(1).max(4),
    price: z.coerce.number().positive().max(9999999999.99).multipleOf(0.01),
  }).safeParse({ slot: form.get("slot"), price: form.get("price") });
  if (!parsed.success) return fail("Choose a sample and enter a price above zero with at most two decimal places.");
  const db = await createClient();
  const { data: old, error: readError } = await db.from("id_college_samples").select("image_path").eq("slot", parsed.data.slot).maybeSingle();
  if (readError) return fail("Couldn't load the sample. Please try again.");
  let path = old?.image_path;
  const staged = form.get("stagedImage");
  if (staged) {
    const image = await stagedToWebp(staged, actor.id, { folder: "id-college", maxWidth: 1920 });
    if ("error" in image) return fail(image.error);
    const { error } = await db.storage.from(PUBLIC_IMAGES_BUCKET).upload(image.path, image.body, { contentType: "image/webp", cacheControl: "31536000" });
    if (error) return fail("Couldn't upload the sample.");
    path = image.path;
  }
  if (!path) return fail("Choose a sample image.");
  const { error } = await db.from("id_college_samples").upsert({ ...parsed.data, image_path: path });
  if (error) {
    if (path !== old?.image_path) await db.storage.from(PUBLIC_IMAGES_BUCKET).remove([path]);
    return fail("Couldn't save the sample.");
  }
  updateTag(CACHE_TAGS.settings);
  refresh();
  return ok();
}

export async function removeIdCollegeSample(slot: number): Promise<ActionResult> {
  await requireSuperAdmin();
  if (!Number.isInteger(slot) || slot < 1 || slot > 4) return fail("Invalid sample.");
  const db = await createClient();
  const { error } = await db.from("id_college_samples").delete().eq("slot", slot);
  if (error) return fail("Couldn't remove the sample.");
  updateTag(CACHE_TAGS.settings);
  refresh();
  return ok();
}
