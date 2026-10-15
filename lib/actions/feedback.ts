"use server";

import { refresh, updateTag } from "next/cache";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions/result";
import { logAudit } from "@/lib/audit";
import { requireCustomer, requireSuperAdmin } from "@/lib/auth";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validations/common";
import { feedbackSchema, type FeedbackInput } from "@/lib/validations/feedback";

// Creates or replaces the customer's feedback for a seller. RLS and the
// table trigger make sure it's written as them, under their own name.
export async function saveFeedback(input: FeedbackInput): Promise<ActionResult> {
  const customer = await requireCustomer();
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { sellerId, reaction, rating, comment } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("seller_feedback")
    .upsert(
      { seller_id: sellerId, customer_id: customer.id, reaction, rating, comment },
      { onConflict: "seller_id,customer_id" }
    );
  if (error) {
    return fail(error.code === "23503" ? "This seller no longer exists." : "Couldn't save your feedback. Please try again.");
  }

  updateTag(CACHE_TAGS.sellers);
  refresh();
  return ok();
}

export async function deleteMyFeedback(sellerId: string): Promise<ActionResult> {
  const customer = await requireCustomer();
  if (!uuidSchema.safeParse(sellerId).success) return fail("Seller not found.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("seller_feedback")
    .delete()
    .eq("seller_id", sellerId)
    .eq("customer_id", customer.id);
  if (error) return fail("Couldn't remove your feedback. Please try again.");

  updateTag(CACHE_TAGS.sellers);
  refresh();
  return ok();
}

// Moderation: the super admin can remove any review
export async function deleteFeedback(id: string): Promise<ActionResult> {
  const actor = await requireSuperAdmin();
  if (!uuidSchema.safeParse(id).success) return fail("Review not found.");

  const supabase = await createClient();
  const { data, error } = await supabase.from("seller_feedback").delete().eq("id", id).select("id");
  if (error || data.length === 0) return fail("Couldn't delete this review.");

  await logAudit(actor.id, "feedback.delete", id);
  updateTag(CACHE_TAGS.sellers);
  refresh();
  return ok();
}
