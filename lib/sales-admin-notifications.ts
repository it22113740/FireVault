import "server-only";

import { sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";

export async function sendSalesAdminNotifications(profileId?: string) {
  const db = createAdminClient();
  const now = new Date().toISOString();
  let query = db.from("sales_admin_notifications").select("*")
    .is("sent_at", null).is("cancelled_at", null)
    .lte("due_at", now).lte("next_attempt_at", now)
    .order("next_attempt_at").limit(10);
  if (profileId) query = query.eq("profile_id", profileId);
  const { data: pending, error } = await query;
  if (error) throw error;

  let sent = 0;
  let failed = 0;
  for (const notification of pending) {
    // Atomically lease each row so concurrent requests don't send it together.
    // A crashed worker leaves it available for retry after five minutes.
    const { data: claimed, error: claimError } = await db.from("sales_admin_notifications")
      .update({ next_attempt_at: new Date(Date.now() + 300_000).toISOString() })
      .eq("id", notification.id).eq("next_attempt_at", notification.next_attempt_at)
      .is("sent_at", null).is("cancelled_at", null).select("id").maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) continue;

    const { data: profile, error: profileError } = await db.from("profiles")
      .select("email, full_name, role, is_active, active_until")
      .eq("id", notification.profile_id).single();
    if (profileError) { failed++; continue; }
    if (profile.role !== "sales_admin" || (notification.reason === "expired" &&
      (!profile.is_active || !profile.active_until ||
        new Date(profile.active_until).getTime() !== new Date(notification.due_at).getTime()))) {
      const { error } = await db.from("sales_admin_notifications")
        .update({ cancelled_at: now }).eq("id", notification.id);
      if (error) throw error;
      continue;
    }
    const reason = notification.reason === "expired"
      ? "Your salesperson access has expired because your access period has ended."
      : "Your salesperson access has been deactivated by an administrator.";
    const delivered = await sendEmail({
      to: profile.email,
      subject: "FireVault salesperson access deactivated",
      text: `Hi ${profile.full_name},\n\n${reason}\n\nYou can no longer access the salesperson dashboard. Please contact the administrator to renew or reactivate your access.\n\n${SITE_URL}\n\nFireVault`,
      idempotencyKey: `sales-admin-deactivation/${notification.id}`,
    });
    if (!delivered) { failed++; continue; }
    const { error: saveError } = await db.from("sales_admin_notifications")
      .update({ sent_at: new Date().toISOString() }).eq("id", notification.id);
    if (saveError) throw saveError;
    sent++;
  }
  return { sent, failed };
}
