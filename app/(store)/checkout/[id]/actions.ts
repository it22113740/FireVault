"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { checkoutSchema } from "@/src/lib/order-schema";
import { LISTINGS_TAG } from "@/src/lib/store";
import { createPublicClient } from "@/src/lib/supabase/public";

export type CheckoutState =
  | {
      orderId?: string;
      error?: string;
      fieldErrors?: Record<string, string[] | undefined>;
    }
  | undefined;

export async function placeOrder(
  _prevState: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const parsed = checkoutSchema.safeParse({
    listingId: formData.get("listingId"),
    buyerName: formData.get("buyerName") ?? "",
    buyerPhone: formData.get("buyerPhone") ?? "",
    buyerEmail: formData.get("buyerEmail") ?? "",
    paymentMethod: formData.get("paymentMethod"),
    slipPath: formData.get("slipPath") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const order = parsed.data;
  // Runs as anon: place_order is SECURITY DEFINER and reserves the listing
  // and inserts the order in one transaction
  const { data: orderId, error } = await createPublicClient().rpc("place_order", {
    p_listing_id: order.listingId,
    p_buyer_name: order.buyerName,
    p_buyer_phone: order.buyerPhone,
    p_buyer_email: order.buyerEmail,
    p_payment_method: order.paymentMethod,
    p_payment_slip_url: order.slipPath,
  });

  if (error) {
    // listing_unavailable: lost the race; 23505: active-order unique index
    if (error.hint === "listing_unavailable" || error.code === "23505") {
      updateTag(LISTINGS_TAG);
      return {
        error:
          "Sorry, someone else just ordered this account. If you already paid, contact us with your slip and we'll refund you.",
      };
    }
    return { error: "Couldn't place your order. Please try again." };
  }

  updateTag(LISTINGS_TAG);
  return { orderId: orderId as string };
}
