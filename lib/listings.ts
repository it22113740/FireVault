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

export function canToggleAvailability(status: PublishStatus, isSuperAdmin: boolean) {
  return isSuperAdmin || salesAdminCanEdit(status);
}
