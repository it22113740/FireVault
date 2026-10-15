"use server";

import { refresh } from "next/cache";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { logAudit } from "@/lib/audit";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validations/common";

// Blocked customers are signed out on their next click (proxy.ts) and can't
// write feedback (RLS checks is_active_customer()). Their past reviews stay.
export async function setCustomerActive(id: string, active: boolean): Promise<ActionResult> {
  const actor = await requireSuperAdmin();
  if (!uuidSchema.safeParse(id).success || typeof active !== "boolean") {
    return fail("Customer not found.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ is_active: active })
    .eq("id", id)
    .eq("role", "customer")
    .select("id");
  if (error || data.length === 0) return fail("Couldn't update this customer.");

  await logAudit(actor.id, active ? "customer.unblock" : "customer.block", id);
  refresh();
  return ok();
}
