"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { requireSuperAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { stagedToWebp } from "@/lib/images";
import { PUBLIC_IMAGES_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export async function createAnnouncement(formData: FormData): Promise<ActionResult> {
  const profile = await requireSuperAdmin();
  const title = z.string().trim().min(1).max(160).safeParse(formData.get("title"));
  if (!title.success) return fail("Enter a banner description of 1–160 characters.");
  const image = await stagedToWebp(formData.get("stagedImage"), profile.id, { folder: "announcements", maxWidth: 1920 });
  if ("error" in image) return fail(image.error);
  const supabase = await createClient();
  const storage = supabase.storage.from(PUBLIC_IMAGES_BUCKET);
  const { error: uploadError } = await storage.upload(image.path, image.body, {
    contentType: "image/webp", cacheControl: "31536000",
  });
  if (uploadError) return fail("Couldn't upload the banner. Please try again.");
  const { data, error } = await supabase.from("announcements")
    .insert({ title: title.data, image_path: image.path }).select("id").single();
  if (error || !data) {
    await storage.remove([image.path]);
    return fail("Couldn't save the announcement. Please try again.");
  }
  await logAudit(profile.id, "announcement.create", data.id);
  updateTag(CACHE_TAGS.announcements);
  refresh();
  return ok();
}

export async function setAnnouncementPublished(id: string, published: boolean): Promise<ActionResult> {
  const profile = await requireSuperAdmin();
  if (!z.uuid().safeParse(id).success || typeof published !== "boolean") return fail("Invalid announcement.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("announcements").update({ published }).eq("id", id).select("id").maybeSingle();
  if (error || !data) return fail("Couldn't update the announcement.");
  await logAudit(profile.id, published ? "announcement.publish" : "announcement.hide", id);
  updateTag(CACHE_TAGS.announcements);
  refresh();
  return ok();
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const profile = await requireSuperAdmin();
  if (!z.uuid().safeParse(id).success) return fail("Invalid announcement.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("announcements").delete().eq("id", id).select("image_path").maybeSingle();
  if (error || !data) return fail("Couldn't delete the announcement.");
  await supabase.storage.from(PUBLIC_IMAGES_BUCKET).remove([data.image_path]);
  await logAudit(profile.id, "announcement.delete", id);
  updateTag(CACHE_TAGS.announcements);
  refresh();
  return ok();
}
