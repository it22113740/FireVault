"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/src/lib/auth";
import { parseListingForm } from "@/src/lib/listing-schema";
import {
  EDITABLE_LISTING_STATUSES,
  LISTING_IMAGES_BUCKET,
  listingImagePath,
} from "@/src/lib/listings";
import { LISTINGS_TAG } from "@/src/lib/store";
import { createClient } from "@/src/lib/supabase/server";

export type ListingFormState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

const idSchema = z.uuid();

export async function createListing(
  _prevState: ListingFormState,
  formData: FormData
): Promise<ListingFormState> {
  await requireAdmin();

  const parsed = parseListingForm(formData);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("listings").insert(parsed.data);
  if (error) {
    return { error: "Couldn't save the listing. Please try again." };
  }

  updateTag(LISTINGS_TAG);
  redirect("/admin/posts");
}

export async function updateListing(
  id: string,
  _prevState: ListingFormState,
  formData: FormData
): Promise<ListingFormState> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { error: "Listing not found" };

  const parsed = parseListingForm(formData);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("listings")
    .select("images")
    .eq("id", id)
    .single();
  if (!current) return { error: "Listing not found" };

  const { status, ...fields } = parsed.data;
  const { error } = await supabase.from("listings").update(fields).eq("id", id);
  if (error) {
    return { error: "Couldn't save the listing. Please try again." };
  }

  // Separate, conditional update so an edit never overrides a status set by
  // an order (reserved/sold), even if a buyer reserves it mid-edit
  await supabase
    .from("listings")
    .update({ status })
    .eq("id", id)
    .in("status", EDITABLE_LISTING_STATUSES);

  // Best effort: clean up images removed from the listing
  const removed = (current.images as string[]).filter(
    (url) => !fields.images.includes(url)
  );
  if (removed.length > 0) {
    await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .remove(removed.map(listingImagePath));
  }

  updateTag(LISTINGS_TAG);
  redirect("/admin/posts");
}

export async function archiveListing(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { error: "Listing not found" };

  const supabase = await createClient();
  // Reserved listings have a live order, so they can't be archived
  const { data, error } = await supabase
    .from("listings")
    .update({ status: "archived" })
    .eq("id", id)
    .in("status", ["available", "sold"])
    .select("id");

  if (error || data.length === 0) {
    return { error: "Only available or sold listings can be archived." };
  }

  updateTag(LISTINGS_TAG);
  refresh();
  return {};
}
