"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions/result";
import { logAudit, type AuditAction } from "@/lib/audit";
import { requireStaff, requireSuperAdmin } from "@/lib/auth";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { stagedToWebp } from "@/lib/images";
import {
  LISTING_IMAGE_SIZE,
  publishesDirectly,
  salesAdminCanEdit,
  type Availability,
  type PublishStatus,
} from "@/lib/listings";
import { PUBLIC_IMAGES_BUCKET, publicImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { parsePrice, uuidSchema } from "@/lib/validations/common";
import {
  LISTING_INTENTS,
  listingFormSchema,
  missingForSubmit,
  rejectListingSchema,
  type ListingIntent,
} from "@/lib/validations/listing";

type SavedListing = { id: string; status: PublishStatus; imageUrl: string };

// Descriptions render as plain text; drop any HTML a seller pastes in
const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "");

const AUDIT_BY_INTENT: Record<Exclude<ListingIntent, "autosave">, AuditAction> = {
  draft: "listing.update",
  submit: "listing.submit",
  publish: "listing.publish",
};

export async function saveListing(formData: FormData): Promise<ActionResult<SavedListing>> {
  const profile = await requireStaff();
  const isSuperAdmin = profile.role === "super_admin";
  const canPublish = publishesDirectly(profile);

  const intentResult = z.enum(LISTING_INTENTS).safeParse(formData.get("intent"));
  if (!intentResult.success) return fail("Unknown action.");
  const intent = intentResult.data;
  if (intent === "publish" && !canPublish) {
    return fail("Only a super admin can publish. Submit it for review instead.");
  }
  if (intent === "submit" && isSuperAdmin) return fail("Publish the listing directly.");

  const rawId = formData.get("id");
  const id = typeof rawId === "string" && rawId ? rawId : null;
  if (id && !uuidSchema.safeParse(id).success) return fail("Listing not found.");

  const raw = {
    title: String(formData.get("title") ?? ""),
    description: stripHtml(String(formData.get("description") ?? "")),
    price: String(formData.get("price") ?? ""),
    region: String(formData.get("region") ?? ""),
    exchangeAvailable: formData.get("exchangeAvailable") === "true",
    // Sent as "id1,id2"; order is the order shops are shown in
    sellerIds: isSuperAdmin
      ? [...new Set(String(formData.get("sellerIds") ?? "").split(",").filter(Boolean))]
      : [],
  };
  const parsed = listingFormSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);
  const values = parsed.data;

  const supabase = await createClient();

  // RLS scopes this: sales admins only see their own listings
  const { data: existing } = id
    ? await supabase
        .from("listings")
        .select("id, image_path, publish_status, created_by")
        .eq("id", id)
        .maybeSingle()
    : { data: null };
  if (id && !existing) return fail("Listing not found.");
  if (existing && !isSuperAdmin && !salesAdminCanEdit(existing.publish_status)) {
    return fail("This listing can't be edited while it's in review or archived.");
  }
  if (
    intent === "autosave" &&
    existing &&
    existing.publish_status !== "draft" &&
    existing.publish_status !== "rejected"
  ) {
    return fail("Only drafts are autosaved.");
  }

  // A super admin can file the listing under seller shops; the trigger lets
  // only super admins set created_by. One seller owns it outright; none or
  // several keep it with a super admin (several = shared, in listing_sellers).
  let ownerId = existing?.created_by ?? profile.id;
  if (isSuperAdmin) {
    if (values.sellerIds.length > 0) {
      const { data: shops } = await supabase.from("seller_profiles").select("id").in("id", values.sellerIds);
      if ((shops ?? []).length !== values.sellerIds.length) {
        return { ok: false, error: "Choose sellers from the list.", fieldErrors: { sellerIds: ["Choose sellers from the list"] } };
      }
    }
    if (values.sellerIds.length === 1) {
      ownerId = values.sellerIds[0];
    } else if (existing) {
      // Keep a super admin's listing with its owner; take one away from a
      // seller's shop to this super admin
      const { data: ownerShop } = await supabase
        .from("seller_profiles")
        .select("id")
        .eq("id", existing.created_by)
        .maybeSingle();
      if (ownerShop) ownerId = profile.id;
    } else {
      ownerId = profile.id;
    }
  }

  const { data: settings } = await supabase.from("app_settings").select("regions").single();
  if (values.region && !settings?.regions.includes(values.region)) {
    return { ok: false, error: "Choose a region from the list.", fieldErrors: { region: ["Choose a region from the list"] } };
  }

  // New image: the browser staged the original (up to 30 MB); convert it to
  // WebP and upload that as the acting user
  let uploadedPath: string | null = null;
  const stagedImage = formData.get("stagedImage");
  if (stagedImage) {
    // Half of 3500 × 5200, so stored images keep the listing ratio exactly
    const image = await stagedToWebp(stagedImage, profile.id, {
      folder: "listings",
      maxWidth: LISTING_IMAGE_SIZE.width / 2,
    });
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

  if (intent === "submit" || intent === "publish") {
    const missing = missingForSubmit(values, imagePath !== "");
    if (Object.keys(missing).length > 0) {
      await removeUploaded();
      return {
        ok: false,
        error: "Complete the listing first.",
        fieldErrors: Object.fromEntries(Object.entries(missing).map(([key, message]) => [key, [message]])),
      };
    }
  }

  // Saving a draft keeps a rejected listing "rejected" so the reason stays visible
  const nextStatus: PublishStatus =
    intent === "publish"
      ? "published"
      : intent === "submit"
        ? "pending_review"
        : existing?.publish_status === "rejected"
          ? "rejected"
          : "draft";

  const row = {
    title: values.title,
    description: values.description,
    price: parsePrice(values.price),
    region: values.region,
    exchange_available: values.exchangeAvailable,
    image_path: imagePath,
    publish_status: nextStatus,
    ...(intent === "publish" && isSuperAdmin ? { reviewed_by: profile.id, rejection_reason: null } : {}),
    ...(isSuperAdmin ? { created_by: ownerId } : {}),
  };

  // The listings trigger has the final say on status (e.g. a sales admin
  // editing a live listing is sent back to review)
  const { data: saved, error } = existing
    ? await supabase.from("listings").update(row).eq("id", existing.id).select("id, publish_status").single()
    : await supabase
        .from("listings")
        .insert({ ...row, created_by: ownerId })
        .select("id, publish_status")
        .single();

  if (error || !saved) {
    await removeUploaded();
    if (error?.code === "23514") return fail("Complete the listing first.");
    if (error?.code === "42501") return fail(error.message);
    return fail("Couldn't save the listing. Please try again.");
  }

  // Shared listings: replace the shop list (empty unless 2+ sellers chosen)
  let sellersError = false;
  if (isSuperAdmin) {
    const shared = values.sellerIds.length > 1 ? values.sellerIds : [];
    const { error: deleteError } = await supabase.from("listing_sellers").delete().eq("listing_id", saved.id);
    const { error: insertError } = shared.length
      ? await supabase
          .from("listing_sellers")
          .insert(shared.map((sellerId, position) => ({ listing_id: saved.id, seller_id: sellerId, position })))
      : { error: null };
    sellersError = !!(deleteError || insertError);
  }

  if (uploadedPath && existing?.image_path && existing.image_path !== uploadedPath) {
    await supabase.storage.from(PUBLIC_IMAGES_BUCKET).remove([existing.image_path]);
  }

  // Autosaves of an existing draft aren't worth an audit row every 10s
  if (!existing || intent !== "autosave") {
    await logAudit(
      profile.id,
      !existing ? "listing.create" : AUDIT_BY_INTENT[intent as Exclude<ListingIntent, "autosave">],
      saved.id,
      { status: saved.publish_status, ...(isSuperAdmin ? { owner: ownerId, sellers: values.sellerIds } : {}) }
    );
  }
  if (saved.publish_status === "published" || existing?.publish_status === "published") {
    updateTag(CACHE_TAGS.listings);
    // Moving a live listing between shops changes their "for sale" counts
    updateTag(CACHE_TAGS.sellers);
  }

  if (sellersError) return fail("The listing was saved, but its sellers couldn't be updated. Save it again.");
  return ok({ id: saved.id, status: saved.publish_status, imageUrl: publicImageUrl(imagePath) });
}

export async function setAvailability(id: string, availability: Availability): Promise<ActionResult> {
  const profile = await requireStaff();
  if (!uuidSchema.safeParse(id).success) return fail("Listing not found.");
  if (availability !== "available" && availability !== "reserved") return fail("Invalid status.");

  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .update({ availability })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  // Not their own: a seller can still reserve a shared listing their shop is on
  const changed =
    !!data ||
    (profile.role === "sales_admin" &&
      (await supabase.rpc("set_shared_listing_availability", { p_listing_id: id, p_availability: availability }))
        .data === true);
  if (!changed) return fail("You can't change this listing right now.");

  await logAudit(profile.id, "listing.availability", id, { availability });
  updateTag(CACHE_TAGS.listings);
  return ok();
}

// Archive replaces deletion for anything that has been live (keeps history)
export async function archiveListing(id: string): Promise<ActionResult> {
  const profile = await requireStaff();
  if (!uuidSchema.safeParse(id).success) return fail("Listing not found.");

  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .update({ publish_status: "archived" })
    .eq("id", id)
    .eq("publish_status", "published")
    .select("id")
    .maybeSingle();
  if (!data) return fail("Only live listings can be archived.");

  await logAudit(profile.id, "listing.archive", id);
  updateTag(CACHE_TAGS.listings);
  refresh();
  return ok();
}

export async function deleteListing(id: string): Promise<ActionResult> {
  const profile = await requireStaff();
  if (!uuidSchema.safeParse(id).success) return fail("Listing not found.");

  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .delete()
    .eq("id", id)
    .in("publish_status", ["draft", "rejected"])
    .select("image_path")
    .maybeSingle();
  if (!data) return fail("Only drafts and rejected listings can be deleted. Archive live ones instead.");

  if (data.image_path) await supabase.storage.from(PUBLIC_IMAGES_BUCKET).remove([data.image_path]);
  await logAudit(profile.id, "listing.delete", id);
  refresh();
  return ok();
}

export async function approveListing(id: string): Promise<ActionResult> {
  const reviewer = await requireSuperAdmin();
  if (!uuidSchema.safeParse(id).success) return fail("Listing not found.");

  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .update({ publish_status: "published", reviewed_by: reviewer.id, rejection_reason: null })
    .eq("id", id)
    .eq("publish_status", "pending_review")
    .select("id")
    .maybeSingle();
  if (!data) return fail("This listing is no longer waiting for review.");

  await logAudit(reviewer.id, "listing.approve", id);
  updateTag(CACHE_TAGS.listings);
  refresh();
  return ok();
}

export async function rejectListing(id: string, reason: string): Promise<ActionResult> {
  const reviewer = await requireSuperAdmin();
  const parsed = rejectListingSchema.safeParse({ id, reason });
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .update({
      publish_status: "rejected",
      rejection_reason: parsed.data.reason,
      reviewed_by: reviewer.id,
    })
    .eq("id", parsed.data.id)
    .eq("publish_status", "pending_review")
    .select("id")
    .maybeSingle();
  if (!data) return fail("This listing is no longer waiting for review.");

  await logAudit(reviewer.id, "listing.reject", parsed.data.id, { reason: parsed.data.reason });
  refresh();
  return ok();
}
