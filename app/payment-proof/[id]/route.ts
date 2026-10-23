import { RECEIPTS_BUCKET } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { uuidSchema } from "@/lib/validations/common";

// Shareable link to an order's proof of payment, sent in the customer's
// WhatsApp message. The order ID (a random UUID) is the key; each visit gets
// a fresh short-lived signed URL, so the receipts bucket stays private.
const SIGNED_URL_TTL = 5 * 60;

export async function GET(_request: Request, ctx: RouteContext<"/payment-proof/[id]">) {
  const { id } = await ctx.params;
  if (!uuidSchema.safeParse(id).success) return new Response("Not found", { status: 404 });

  const supabase = createAdminClient();
  const { data: order } = await supabase.from("topup_orders").select("receipt_path").eq("id", id).maybeSingle();
  if (!order) return new Response("Not found", { status: 404 });

  const { data } = await supabase.storage.from(RECEIPTS_BUCKET).createSignedUrl(order.receipt_path, SIGNED_URL_TTL);
  if (!data) return new Response("Couldn't load the image. Try again.", { status: 503 });

  return new Response(null, {
    status: 302,
    headers: { Location: data.signedUrl, "Cache-Control": "no-store" },
  });
}
