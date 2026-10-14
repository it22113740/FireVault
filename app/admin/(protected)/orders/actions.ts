"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/src/lib/auth";
import { LISTINGS_TAG } from "@/src/lib/store";
import { createClient } from "@/src/lib/supabase/server";

const statusChangeSchema = z.object({
  orderId: z.uuid(),
  status: z.enum(["paid", "delivered", "rejected"]),
});

export async function setOrderStatus(
  orderId: string,
  status: "paid" | "delivered" | "rejected"
): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = statusChangeSchema.safeParse({ orderId, status });
  if (!parsed.success) return { error: "Invalid request" };

  const supabase = await createClient();
  // Updates the order and its listing in one transaction
  const { error } = await supabase.rpc("set_order_status", {
    p_order_id: parsed.data.orderId,
    p_status: parsed.data.status,
  });

  if (error) {
    if (error.hint === "invalid_transition") {
      return { error: "This order's status changed. Reload and try again." };
    }
    return { error: "Couldn't update the order. Please try again." };
  }

  // delivered -> listing sold, rejected -> listing available
  updateTag(LISTINGS_TAG);
  refresh();
  return {};
}

export type NoteState = { saved?: boolean; error?: string } | undefined;

const noteSchema = z.object({
  orderId: z.uuid(),
  note: z.string().trim().max(2000, "Notes must be 2000 characters or fewer"),
});

export async function saveAdminNote(
  orderId: string,
  _prevState: NoteState,
  formData: FormData
): Promise<NoteState> {
  await requireAdmin();
  const parsed = noteSchema.safeParse({ orderId, note: formData.get("note") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ admin_note: parsed.data.note || null })
    .eq("id", parsed.data.orderId);

  if (error) return { error: "Couldn't save the note. Please try again." };
  return { saved: true };
}
