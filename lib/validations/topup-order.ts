import { z } from "zod";
import { phoneSchema } from "@/lib/validations/common";

export const MAX_ORDER_QUANTITY = 5;

// Buy dialog on /top-ups. The receipt image is checked separately (it's a
// File, validated on the server by lib/images.ts).
export const topupOrderSchema = z.object({
  topupId: z.uuid("Choose a top-up"),
  playerUid: z
    .string()
    .trim()
    .regex(/^[0-9]{5,20}$/, "Enter your player UID (numbers only, from your in-game profile)"),
  // Set with the − / + buttons, so always a number
  quantity: z
    .number("Choose how many")
    .int()
    .min(1, "Order at least 1")
    .max(MAX_ORDER_QUANTITY, `You can order up to ${MAX_ORDER_QUANTITY} at a time`),
  whatsappNumber: phoneSchema,
});
export type TopupOrderInput = z.input<typeof topupOrderSchema>;
export type TopupOrderOutput = z.output<typeof topupOrderSchema>;
