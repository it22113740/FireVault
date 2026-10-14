import { z } from "zod";

export const LISTING_LIMITS = { title: 100, description: 2000, reason: 500 } as const;

// Shown with thousands separators in the form ("15,000"); stored as a number
export function parsePrice(value: string) {
  const cleaned = value.replace(/,/g, "").trim();
  return cleaned === "" ? 0 : Number(cleaned);
}

export function formatPriceInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole, ...decimals] = cleaned.split(".");
  const grouped = whole ? Number(whole).toLocaleString("en-US") : "";
  return decimals.length ? `${grouped}.${decimals.join("").slice(0, 2)}` : grouped;
}

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
  price: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\d{1,10}(\.\d{1,2})?$/.test(value.replace(/,/g, "")),
      "Enter a price like 15,000"
    ),
  region: z.string().trim().max(20),
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
