import { z } from "zod";
import { PAYMENT_METHOD_IDS } from "@/src/lib/payment-methods";

export const PAYMENT_SLIPS_BUCKET = "payment-slips";
export const MAX_SLIP_BYTES = 5 * 1024 * 1024;
export const ALLOWED_SLIP_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

// Stored normalized: "077 123-4567" -> "0771234567"
const phoneSchema = z
  .string()
  .transform((value) => value.replace(/[\s\-().]/g, ""))
  .pipe(z.string().regex(/^\+?\d{7,15}$/, "Enter a valid phone number"));

export const checkoutSchema = z.object({
  listingId: z.uuid(),
  buyerName: z
    .string()
    .trim()
    .min(1, "Enter your name")
    .max(100, "Must be 100 characters or fewer"),
  buyerPhone: phoneSchema,
  buyerEmail: z.union([z.literal(""), z.email("Enter a valid email")]),
  paymentMethod: z.enum(PAYMENT_METHOD_IDS, { error: "Choose a payment method" }),
  // Path the browser uploaded to; generated as <uuid>.<ext>
  slipPath: z
    .string({ error: "Upload your payment slip" })
    .regex(
      /^[0-9a-f-]{36}\.(jpeg|png|webp|pdf)$/,
      "Upload your payment slip"
    ),
});
