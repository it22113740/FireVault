"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions/result";
import { logAudit } from "@/lib/audit";
import { requireSuperAdmin } from "@/lib/auth";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { stagedToWebp } from "@/lib/images";
import { PUBLIC_IMAGES_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { parsePrice, uuidSchema } from "@/lib/validations/common";
import { TOPUP_INTENTS, missingForPublish, topupFormSchema } from "@/lib/validations/topup";

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "");

export async function saveTopup(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const profile = await requireSuperAdmin();

  const intent = z.enum(TOPUP_INTENTS).safeParse(formData.get("intent"));
  if (!intent.success) return fail("Unknown action.");

  const rawId = formData.get("id");
  const id = typeof rawId === "string" && rawId ? rawId : null;
  if (id && !uuidSchema.safeParse(id).success) return fail("Top-up not found.");

  const parsed = topupFormSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: stripHtml(String(formData.get("description") ?? "")),
    price: String(formData.get("price") ?? ""),
    category: formData.get("category"),
  });
  if (!parsed.success) return invalid(parsed.error);
  const values = parsed.data;

  const supabase = await createClient();
  const { data: existing } = id
    ? await supabase.from("topups").select("id, image_path, category, status").eq("id", id).maybeSingle()
    : { data: null };
  if (id && !existing) return fail("Top-up not found.");

  let uploadedPath: string | null = null;
  // The browser staged the original (up to 30 MB); store it as WebP
  const stagedImage = formData.get("stagedImage");
  if (stagedImage) {
    const image = await stagedToWebp(stagedImage, profile.id, { folder: "topups", maxWidth: 1000 });
    if ("error" in image) return { ok: false, error: image.error, fieldErrors: { image: [image.error] } };
    const { error } = await supabase.storage
      .from(PUBLIC_IMAGES_BUCKET)
      .upload(image.path, image.body, { contentType: "image/webp", cacheControl: "31536000" });
    if (error) return fail("Couldn't upload the image. Please try again.");
    uploadedPath = image.path;
  }
  const removeUploaded = async () => {
    if (uploadedPath) await supabase.storage.from(PUBLIC_IMAGES_BUCKET).remove([uploadedPath]);
  };
  const imagePath = uploadedPath ?? existing?.image_path ?? "";

  if (intent.data === "publish") {
    const missing = missingForPublish(values, imagePath !== "");
    if (Object.keys(missing).length > 0) {
      await removeUploaded();
      return {
        ok: false,
        error: "Complete the top-up first.",
        fieldErrors: Object.fromEntries(Object.entries(missing).map(([key, message]) => [key, [message]])),
      };
    }
  }

  // New packs (or packs moved to another category) go to the end of the list
  let sortOrder: number | undefined;
  if (!existing || existing.category !== values.category) {
    const { data: last } = await supabase
      .from("topups")
      .select("sort_order")
      .eq("category", values.category)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    sortOrder = (last?.sort_order ?? -1) + 1;
  }

  const row = {
    name: values.name,
    description: values.description,
    price: parsePrice(values.price),
    category: values.category,
    image_path: imagePath,
    status: intent.data === "publish" ? ("published" as const) : ("draft" as const),
    ...(sortOrder !== undefined ? { sort_order: sortOrder } : {}),
  };

  const { data: saved, error } = existing
    ? await supabase.from("topups").update(row).eq("id", existing.id).select("id").single()
    : await supabase.from("topups").insert({ ...row, created_by: profile.id }).select("id").single();

  if (error || !saved) {
    await removeUploaded();
    return fail(error?.code === "23514" ? "Complete the top-up first." : "Couldn't save the top-up.");
  }

  if (uploadedPath && existing?.image_path && existing.image_path !== uploadedPath) {
    await supabase.storage.from(PUBLIC_IMAGES_BUCKET).remove([existing.image_path]);
  }

  await logAudit(
    profile.id,
    !existing ? "topup.create" : intent.data === "publish" ? "topup.publish" : "topup.update",
    saved.id
  );
  updateTag(CACHE_TAGS.topups);
  return ok({ id: saved.id });
}

export async function setTopupPublished(id: string, published: boolean): Promise<ActionResult> {
  const profile = await requireSuperAdmin();
  if (!uuidSchema.safeParse(id).success) return fail("Top-up not found.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("topups")
    .update({ status: published ? "published" : "draft" })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (!data) {
    return fail(
      error?.code === "23514"
        ? "Add a description, price and image before publishing."
        : "Couldn't update the top-up."
    );
  }

  await logAudit(profile.id, published ? "topup.publish" : "topup.unpublish", id);
  updateTag(CACHE_TAGS.topups);
  refresh();
  return ok();
}

export async function deleteTopup(id: string): Promise<ActionResult> {
  const profile = await requireSuperAdmin();
  if (!uuidSchema.safeParse(id).success) return fail("Top-up not found.");

  const supabase = await createClient();
  const { data } = await supabase.from("topups").delete().eq("id", id).select("image_path").maybeSingle();
  if (!data) return fail("Couldn't delete the top-up.");

  if (data.image_path) await supabase.storage.from(PUBLIC_IMAGES_BUCKET).remove([data.image_path]);
  await logAudit(profile.id, "topup.delete", id);
  updateTag(CACHE_TAGS.topups);
  refresh();
  return ok();
}

// Swap with the neighbour, then renumber the category 0..n so gaps or
// duplicate sort orders never build up
export async function moveTopup(id: string, direction: "up" | "down"): Promise<ActionResult> {
  await requireSuperAdmin();
  if (!uuidSchema.safeParse(id).success) return fail("Top-up not found.");

  const supabase = await createClient();
  const { data: target } = await supabase.from("topups").select("category").eq("id", id).maybeSingle();
  if (!target) return fail("Top-up not found.");

  const { data: siblings } = await supabase
    .from("topups")
    .select("id, sort_order")
    .eq("category", target.category)
    .order("sort_order")
    .order("created_at");
  const order = (siblings ?? []).map((sibling) => sibling.id);
  const index = order.indexOf(id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= order.length) return ok();
  [order[index], order[swapWith]] = [order[swapWith], order[index]];

  const current = new Map((siblings ?? []).map((sibling) => [sibling.id, sibling.sort_order]));
  const results = await Promise.all(
    order
      .map((topupId, position) => ({ topupId, position }))
      .filter(({ topupId, position }) => current.get(topupId) !== position)
      .map(({ topupId, position }) =>
        supabase.from("topups").update({ sort_order: position }).eq("id", topupId)
      )
  );
  if (results.some((result) => result.error)) return fail("Couldn't reorder. Please try again.");

  updateTag(CACHE_TAGS.topups);
  refresh();
  return ok();
}
