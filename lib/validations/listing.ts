import { z } from "zod";
import { parsePrice, priceInputSchema } from "@/lib/validations/common";

export const LISTING_LIMITS = { title: 100, description: 2000, reason: 500 } as const;

// Field formats, checked as you type and for every save (drafts included)
export const listingFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the listing a title")
    .max(LISTING_LIMITS.title, `Keep the title under ${LISTING_LIMITS.title} characters`),
  description: z
    .string()
    .trim()
    .max(LISTING_LIMITS.description, `Keep the description under ${LISTING_LIMITS.description} characters`),
  price: priceInputSchema,
  region: z.string().trim().max(20),
  // Seller is open to swapping for another account
  exchangeAvailable: z.boolean(),
});
export type ListingFormValues = z.input<typeof listingFormSchema>;

export const LISTING_INTENTS = ["draft", "autosave", "submit", "publish"] as const;
export type ListingIntent = (typeof LISTING_INTENTS)[number];

// PLAN.md: required before submit/publish — title, description, price > 0,
// region, image. Drafts may be incomplete.
export function missingForSubmit(values: ListingFormValues, hasImage: boolean) {
  const missing: Partial<Record<keyof ListingFormValues | "image", string>> = {};
  if (!values.description.trim()) missing.description = "Add a description before submitting";
  if (!(parsePrice(values.price) > 0)) missing.price = "Set a price above 0";
  if (!values.region.trim()) missing.region = "Choose a region";
  if (!hasImage) missing.image = "Add an image";
  return missing;
}

export const rejectListingSchema = z.object({
  id: z.uuid(),
  reason: z
    .string()
    .trim()
    .min(1, "Tell the seller what to fix")
    .max(LISTING_LIMITS.reason, `Keep the reason under ${LISTING_LIMITS.reason} characters`),
});
