import { z } from "zod";
import { parsePrice, priceInputSchema } from "@/lib/validations/common";

export const TOPUP_LIMITS = { name: 100, description: 1000 } as const;

export const topupFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the pack a name")
    .max(TOPUP_LIMITS.name, `Keep the name under ${TOPUP_LIMITS.name} characters`),
  description: z
    .string()
    .trim()
    .max(TOPUP_LIMITS.description, `Keep the description under ${TOPUP_LIMITS.description} characters`),
  price: priceInputSchema,
  category: z.enum(["membership", "vip_bundle", "diamonds"], { error: "Choose a category" }),
});
export type TopupFormValues = z.input<typeof topupFormSchema>;

export const TOPUP_INTENTS = ["draft", "publish"] as const;
export type TopupIntent = (typeof TOPUP_INTENTS)[number];

// Same rule as listings: drafts may be incomplete, published packs may not
export function missingForPublish(values: TopupFormValues, hasImage: boolean) {
  const missing: Partial<Record<keyof TopupFormValues | "image", string>> = {};
  if (!values.description.trim()) missing.description = "Add a description before publishing";
  if (!(parsePrice(values.price) > 0)) missing.price = "Set a price above 0";
  if (!hasImage) missing.image = "Add an image";
  return missing;
}
