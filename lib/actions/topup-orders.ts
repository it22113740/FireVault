"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import sharp from "sharp";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions/result";
import { logAudit } from "@/lib/audit";
import { getCurrentProfile, requireSuperAdmin, type Profile } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { formatPrice, shortId } from "@/lib/format";
import { availablePaymentMethods, getPaymentOptions, paymentMethodLabel, type PaymentMethod } from "@/lib/payments";
import { toWebp } from "@/lib/images";
import { getSettings } from "@/lib/settings";
import { hasActiveAccess } from "@/lib/sales-admin-access";
import { SITE_URL } from "@/lib/site";
import { RECEIPTS_BUCKET } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsApp } from "@/lib/twilio";
import { whatsappUrl } from "@/lib/whatsapp";
import { topupOrderMessage } from "@/lib/whatsapp-messages";
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
  payment_method: PaymentMethod;
  created_at: string;
};

// Buy dialog on /top-ups. The trigger fills in the name and price from the
// live top-up, so the client can't change what it pays.
export async function placeTopupOrder(formData: FormData): Promise<ActionResult<{ id: string; whatsappUrl: string }>> {
  const customer = await getCurrentProfile();
  if (customer && !hasActiveAccess(customer)) return fail("Your account is inactive. Please contact the administrator.");
  const parsed = topupOrderSchema.safeParse({
    topupId: formData.get("topupId") ?? "",
    playerUid: formData.get("playerUid") ?? "",
    quantity: Number(formData.get("quantity")),
    whatsappNumber: formData.get("whatsappNumber") ?? "",
    paymentMethod: formData.get("paymentMethod") ?? "",
  });
  if (!parsed.success) return invalid(parsed.error);
  const order = parsed.data;

  const settings = await getSettings();
  if (!availablePaymentMethods(getPaymentOptions(settings)).includes(order.paymentMethod)) {
    return fail("This payment method isn't available. Refresh the page and choose another.");
  }

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
  if (uploadError) return fail("Couldn't upload your proof of payment. Please try again.");

  const { data: saved, error } = await supabase
    .from("topup_orders")
    .insert({
      customer_id: customer?.id ?? null,
      topup_id: order.topupId,
      player_uid: order.playerUid,
      quantity: order.quantity,
      whatsapp_number: order.whatsappNumber,
      receipt_path: image.path,
      payment_method: order.paymentMethod,
    })
    .select("id, topup_name, quantity, total, currency, player_uid, whatsapp_number, payment_method, created_at")
    .single();
  if (error || !saved) {
    await receipts.remove([image.path]);
    if (error?.code === "P0002") return fail("This top-up is no longer available. Refresh the page.");
    if (error?.code === "P0001") return fail("You've placed several orders already. Please try again in an hour.");
    return fail("Couldn't place your order. Please try again.");
  }

  // Alerts go out after the response so the customer isn't kept waiting
  after(() => notifyNewOrder(saved, customer, settings.admin_whatsapp, { path: image.path, webp: image.body }));
  // The "Order placed" screen's button: the customer sends us the order on WhatsApp
  const message = topupOrderMessage({
    id: saved.id,
    item: `${saved.topup_name} × ${saved.quantity}`,
    total: formatPrice(saved.total, saved.currency),
    paymentMethod: paymentMethodLabel(saved.payment_method),
    playerUid: saved.player_uid,
    whatsappNumber: saved.whatsapp_number,
    customerName: customer?.full_name ?? null,
    proofUrl: `${SITE_URL}/payment-proof/${saved.id}`,
  });
  return ok({ id: saved.id, whatsappUrl: whatsappUrl(settings.admin_whatsapp, message) });
}

// The WhatsApp alert carries the receipt image. WhatsApp shows WebP as a
// sticker, so a JPEG copy is saved next to the receipt and sent through a
// signed URL that works for RECEIPT_LINK_TTL.
const RECEIPT_LINK_TTL = 7 * 24 * 60 * 60;

async function receiptImageLink(receipt: { path: string; webp: Buffer }) {
  try {
    const jpegPath = receipt.path.replace(/\.webp$/, ".jpg");
    const jpeg = await sharp(receipt.webp).flatten({ background: "#ffffff" }).jpeg({ quality: 80 }).toBuffer();
    const storage = createAdminClient().storage.from(RECEIPTS_BUCKET);
    const { error } = await storage.upload(jpegPath, jpeg, { contentType: "image/jpeg", upsert: true });
    if (error) throw new Error(error.message);
    const { data, error: signError } = await storage.createSignedUrl(jpegPath, RECEIPT_LINK_TTL);
    if (signError || !data) throw new Error(signError?.message ?? "No signed URL");
    // The media template's URL is fixed up to ".../object/sign/receipts/";
    // {{7}} is the rest (file path + token)
    const [, variable] = data.signedUrl.split(`/object/sign/${RECEIPTS_BUCKET}/`);
    return variable ? { url: data.signedUrl, variable } : null;
  } catch (error) {
    console.error("Order alert: couldn't prepare the receipt image", error);
    return null;
  }
}

async function notifyNewOrder(
  order: PlacedOrder,
  customer: Profile | null,
  adminWhatsapp: string,
  receipt: { path: string; webp: Buffer }
) {
  const link = `${SITE_URL}/admin/orders?order=${order.id}`;
  const item = `${order.topup_name} × ${order.quantity}`;
  const total = formatPrice(order.total, order.currency);
  const lines = [
    `Order: ${shortId(order.id)}`,
    `Item: ${item}`,
    `Total: ${total}`,
    `Paid by: ${paymentMethodLabel(order.payment_method)}`,
    `Player UID: ${order.player_uid}`,
    customer ? `Customer: ${customer.full_name} (${customer.email})` : "Customer: Guest",
    `Customer WhatsApp: ${order.whatsapp_number}`,
    "",
    `Receipt and details: ${link}`,
  ];

  try {
    const image = await receiptImageLink(receipt);
    const variables: Record<string, string> = {
      "1": shortId(order.id),
      "2": item,
      // The approved template has no payment line, so it rides along here
      "3": `${total} · ${paymentMethodLabel(order.payment_method)}`,
      "4": order.player_uid,
      "5": order.whatsapp_number,
      "6": link,
    };
    // Media template (receipt as the header image) when set up, else the text
    // template, else a plain message with the image (Sandbox)
    const mediaTemplate = process.env.TWILIO_ORDER_MEDIA_TEMPLATE_SID;
    const textTemplate = process.env.TWILIO_ORDER_TEMPLATE_SID;
    const whatsapped = await sendWhatsApp({
      to: adminWhatsapp,
      body: ["New FireVault top-up order", "", ...lines].join("\n"),
      mediaUrl: image?.url,
      template:
        mediaTemplate && image
          ? { sid: mediaTemplate, variables: { ...variables, "7": image.variable } }
          : textTemplate
            ? { sid: textTemplate, variables }
            : undefined,
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
          text: ["A customer placed a top-up order and uploaded proof of payment.", "", ...lines].join("\n"),
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
