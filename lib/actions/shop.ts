"use server";

import { updateTag } from "next/cache";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions/result";
import { logAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { stagedToWebp } from "@/lib/images";
import { PUBLIC_IMAGES_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { shopSchema } from "@/lib/validations/shop";

// Creates (onboarding) or updates the signed-in sales admin's shop profile.
// Logo and cover were staged by the browser (up to 30 MB) and are stored as
// WebP under public-images/sellers/.
export async function saveShop(formData: FormData): Promise<ActionResult<{ slug: string }>> {
  const profile = await requireRole("sales_admin");

  const parsed = shopSchema.safeParse({
    displayName: formData.get("displayName") ?? "",
    slug: formData.get("slug") ?? "",
    description: String(formData.get("description") ?? "").replace(/<[^>]*>/g, ""),
    whatsappGroupUrl: formData.get("whatsappGroupUrl") ?? "",
    tiktokUrl: formData.get("tiktokUrl") ?? "",
    facebookUrl: formData.get("facebookUrl") ?? "",
    totalSold: formData.get("totalSold") ?? "0",
  });
  if (!parsed.success) return invalid(parsed.error);
  const shop = parsed.data;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("seller_profiles")
    .select("logo_path, cover_path")
    .eq("id", profile.id)
    .maybeSingle();

  const uploaded: string[] = [];
  const removeUploaded = async () => {
    if (uploaded.length) await supabase.storage.from(PUBLIC_IMAGES_BUCKET).remove(uploaded);
  };

  async function storeImage(field: "logo" | "cover"): Promise<string | { error: string } | null> {
    const staged = formData.get(field);
    if (!staged) return null;
    const image = await stagedToWebp(staged, profile.id, {
      folder: "sellers",
      maxWidth: field === "logo" ? 512 : 1600,
    });
    if ("error" in image) return image;
    const { error } = await supabase.storage
      .from(PUBLIC_IMAGES_BUCKET)
      .upload(image.path, image.body, { contentType: "image/webp", cacheControl: "31536000" });
    if (error) return { error: "Couldn't upload the image. Please try again." };
    uploaded.push(image.path);
    return image.path;
  }

  const logo = await storeImage("logo");
  if (logo && typeof logo !== "string") {
    return { ok: false, error: logo.error, fieldErrors: { logo: [logo.error] } };
  }
  const cover = await storeImage("cover");
  if (cover && typeof cover !== "string") {
    await removeUploaded();
    return { ok: false, error: cover.error, fieldErrors: { cover: [cover.error] } };
  }

  const logoPath = logo ?? existing?.logo_path ?? "";
  const coverPath = cover ?? existing?.cover_path ?? "";
  if (!logoPath || !coverPath) {
    await removeUploaded();
    return {
      ok: false,
      error: "Add your logo and cover photo.",
      fieldErrors: {
        ...(logoPath ? {} : { logo: ["Add your logo"] }),
        ...(coverPath ? {} : { cover: ["Add a cover photo"] }),
      },
    };
  }

  const { error } = await supabase.from("seller_profiles").upsert({
    id: profile.id,
    display_name: shop.displayName,
    slug: shop.slug,
    description: shop.description,
    logo_path: logoPath,
    cover_path: coverPath,
    whatsapp_group_url: shop.whatsappGroupUrl || null,
    tiktok_url: shop.tiktokUrl || null,
    facebook_url: shop.facebookUrl || null,
    total_sold: shop.totalSold,
  });

  if (error) {
    await removeUploaded();
    if (error.code === "23505") {
      return {
        ok: false,
        error: "That shop link is taken. Try another.",
        fieldErrors: { slug: ["That link is taken"] },
      };
    }
    return fail("Couldn't save your shop. Please try again.");
  }

  // Clean up replaced images (best effort)
  const replaced = [
    logo && existing?.logo_path !== logo ? existing?.logo_path : null,
    cover && existing?.cover_path !== cover ? existing?.cover_path : null,
  ].filter((path): path is string => !!path);
  if (replaced.length) await supabase.storage.from(PUBLIC_IMAGES_BUCKET).remove(replaced);

  await logAudit(profile.id, existing ? "shop.update" : "shop.create", profile.id);
  updateTag(CACHE_TAGS.sellers);
  // Listings show the seller's name and logo
  updateTag(CACHE_TAGS.listings);
  return ok({ slug: shop.slug });
}
