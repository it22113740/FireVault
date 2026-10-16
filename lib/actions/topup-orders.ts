"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions/result";
import { logAudit } from "@/lib/audit";
import { getCurrentProfile, requireSuperAdmin, type Profile } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { formatPrice, shortId } from "@/lib/format";
import { toWebp } from "@/lib/images";
import { getSettings } from "@/lib/settings";
import { hasActiveAccess } from "@/lib/sales-admin-access";
import { SITE_URL } from "@/lib/site";
import { RECEIPTS_BUCKET } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsApp } from "@/lib/twilio";
import { uuidSchema } from "@/lib/validations/common";
import { topupOrderSchema } from "@/lib/validations/topup-order";

const ORDERS_PER_HOUR = 5;

type PlacedOrder = {
  id: string;
  topup_name: string;
  quantity: number;
  total: number;
  currency: string;
  player_uid: string;
  whatsapp_number: string;
  created_at: string;
};

// Buy dialog on /top-ups. The trigger fills in the name and price from the
// live top-up, so the client can't change what it pays.
export async function placeTopupOrder(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const customer = await getCurrentProfile();
  if (customer && !hasActiveAccess(customer)) return fail("Your account is inactive. Please contact the administrator.");
  const parsed = topupOrderSchema.safeParse({
    topupId: formData.get("topupId") ?? "",
    playerUid: formData.get("playerUid") ?? "",
    quantity: Number(formData.get("quantity")),
    whatsappNumber: formData.get("whatsappNumber") ?? "",
  });
  if (!parsed.success) return invalid(parsed.error);
  const order = parsed.data;

  const settings = await getSettings();
  if (!settings.bank_account_number) return fail("Top-up payments aren't set up yet. Please message us on WhatsApp.");

  const supabase = createAdminClient();
  const { count, error: countError } = await supabase
    .from("topup_orders")
    .select("id", { count: "exact", head: true })
    .eq("whatsapp_number", order.whatsappNumber)
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
  if (countError) return fail("Couldn't check your order. Please try again.");
  if ((count ?? 0) >= ORDERS_PER_HOUR) return fail("You've placed several orders already. Please try again in an hour.");

  const image = await toWebp(formData.get("receipt"), { folder: customer?.id ?? "guests" });
  if ("error" in image) return { ok: false, error: image.error, fieldErrors: { receipt: [image.error] } };

  // Private bucket with no insert policy: only the server writes receipts
  const receipts = createAdminClient().storage.from(RECEIPTS_BUCKET);
  const { error: uploadError } = await receipts.upload(image.path, image.body, { contentType: "image/webp" });
  if (uploadError) return fail("Couldn't upload your receipt. Please try again.");

  const { data: saved, error } = await supabase
    .from("topup_orders")
    .insert({
      customer_id: customer?.id ?? null,
      topup_id: order.topupId,
      player_uid: order.playerUid,
      quantity: order.quantity,
      whatsapp_number: order.whatsappNumber,
      receipt_path: image.path,
    })
    .select("id, topup_name, quantity, total, currency, player_uid, whatsapp_number, created_at")
    .single();
  if (error || !saved) {
    await receipts.remove([image.path]);
    if (error?.code === "P0002") return fail("This top-up is no longer available. Refresh the page.");
    if (error?.code === "P0001") return fail("You've placed several orders already. Please try again in an hour.");
    return fail("Couldn't place your order. Please try again.");
  }

  // Alerts go out after the response so the customer isn't kept waiting
  after(() => notifyNewOrder(saved, customer, settings.admin_whatsapp));
  return ok({ id: saved.id });
}

async function notifyNewOrder(order: PlacedOrder, customer: Profile | null, adminWhatsapp: string) {
  const link = `${SITE_URL}/admin/orders?order=${order.id}`;
  const item = `${order.topup_name} × ${order.quantity}`;
  const total = formatPrice(order.total, order.currency);
  const lines = [
    `Order: ${shortId(order.id)}`,
    `Item: ${item}`,
    `Total: ${total}`,
    `Player UID: ${order.player_uid}`,
    customer ? `Customer: ${customer.full_name} (${customer.email})` : "Customer: Guest",
    `Customer WhatsApp: ${order.whatsapp_number}`,
    "",
    `Receipt and details: ${link}`,
  ];

  try {
    const whatsapped = await sendWhatsApp({
      to: adminWhatsapp,
      body: ["New FireVault top-up order", "", ...lines].join("\n"),
      templateVariables: {
        "1": shortId(order.id),
        "2": item,
        "3": total,
        "4": order.player_uid,
        "5": order.whatsapp_number,
        "6": link,
      },
    });
    if (!whatsapped) console.error("Order alert: WhatsApp not sent", order.id);

    // Email too, so an order is never missed if WhatsApp fails
    const { data: admins } = await createAdminClient()
      .from("profiles")
      .select("email")
      .eq("role", "super_admin")
      .eq("is_active", true);
    await Promise.all(
      [...new Set((admins ?? []).map(({ email }) => email))].map((to) =>
        sendEmail({
          to,
          subject: `New top-up order ${shortId(order.id)}: ${item}`,
          text: ["A customer placed a top-up order and uploaded a payment receipt.", "", ...lines].join("\n"),
        })
      )
    );
  } catch (error) {
    console.error("Order alert failed", order.id, error);
  }
}

// Closed once the top-up is delivered (or the payment didn't check out);
// reopening undoes a mistaken close
export async function setTopupOrderClosed(id: string, closed: boolean): Promise<ActionResult> {
  const actor = await requireSuperAdmin();
  if (!uuidSchema.safeParse(id).success || typeof closed !== "boolean") return fail("Order not found.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("topup_orders")
    .update({ status: closed ? "closed" : "open" })
    .eq("id", id)
    .eq("status", closed ? "open" : "closed")
    .select("id");
  if (error) return fail("Couldn't update the order. Please try again.");
  if (data.length === 0) return fail(closed ? "This order is already closed." : "This order is already open.");

  await logAudit(actor.id, closed ? "order.close" : "order.reopen", id);
  refresh();
  return ok();
}
