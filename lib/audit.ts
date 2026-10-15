import "server-only";
import type { Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type AuditAction =
  | "announcement.create"
  | "announcement.publish"
  | "announcement.hide"
  | "announcement.delete"
  | "application.approve"
  | "application.deny"
  | "salesadmin.activate"
  | "salesadmin.deactivate"
  | "listing.create"
  | "listing.update"
  | "listing.submit"
  | "listing.publish"
  | "listing.approve"
  | "listing.reject"
  | "listing.archive"
  | "listing.delete"
  | "listing.availability"
  | "topup.create"
  | "topup.update"
  | "topup.publish"
  | "topup.unpublish"
  | "topup.delete"
  | "settings.update"
  | "shop.create"
  | "shop.update"
  | "customer.block"
  | "customer.unblock"
  | "feedback.delete";

// Written as the acting user (RLS: actor_id must be auth.uid()). Best effort:
// a failed audit write is reported but never undoes the action itself.
export async function logAudit(
  actorId: string,
  action: AuditAction,
  entityId: string | null,
  meta?: Json
) {
  const supabase = await createClient();
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: actorId,
    action,
    entity: action.split(".")[0],
    entity_id: entityId,
    meta: meta ?? null,
  });
  if (error) console.error(`Audit log failed for ${action}:`, error.message);
}
