import type { Enums } from "@/lib/database.types";

export type PublishStatus = Enums<"publish_status">;
export type Availability = Enums<"availability">;

export const PUBLISH_STATUS_LABELS: Record<PublishStatus, string> = {
  draft: "Draft",
  pending_review: "In review",
  published: "Live",
  rejected: "Rejected",
  archived: "Archived",
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  available: "Available",
  reserved: "Reserved",
};

// Mirrors RLS + the listings trigger: what a sales admin may still change
export function salesAdminCanEdit(status: PublishStatus) {
  return status === "draft" || status === "rejected" || status === "published";
}

// Super admins, and sellers the super admin exempted from review, publish
// listings directly (mirrors public.can_self_publish() in the listings trigger)
export function publishesDirectly(profile: { role: string; listings_need_review: boolean }) {
  return profile.role === "super_admin" || (profile.role === "sales_admin" && !profile.listings_need_review);
}

export function canToggleAvailability(status: PublishStatus, isSuperAdmin: boolean) {
  return isSuperAdmin || salesAdminCanEdit(status);
}

// Listing images are portrait 3500 × 5200. Every frame that shows one uses the
// matching Tailwind class `aspect-[35/52]` (class names must be literal) with
// object-contain, so an image of another shape is shown whole, never cropped.
export const LISTING_IMAGE_SIZE = { width: 3500, height: 5200 } as const;
