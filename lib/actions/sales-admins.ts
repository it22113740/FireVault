"use server";

import { refresh } from "next/cache";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { logAudit } from "@/lib/audit";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validations/common";

// Takes effect on the seller's next request: proxy.ts and RLS both check
// is_active. Their live listings stay up (PLAN.md open questions default).
export async function setSalesAdminActive(id: string, active: boolean): Promise<ActionResult> {
  const actor = await requireSuperAdmin();
  if (!uuidSchema.safeParse(id).success || typeof active !== "boolean") {
    return fail("Sales admin not found.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ is_active: active })
    .eq("id", id)
    .eq("role", "sales_admin")
    .select("id");
  if (error || data.length === 0) return fail("Couldn't update this sales admin.");

  await logAudit(actor.id, active ? "salesadmin.activate" : "salesadmin.deactivate", id);
  refresh();
  return ok();
}
