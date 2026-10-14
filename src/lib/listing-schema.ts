import { z } from "zod";
import {
  EDITABLE_LISTING_STATUSES,
  LISTING_IMAGE_URL_PREFIX,
  MAX_LISTING_IMAGES,
} from "@/src/lib/listings";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .transform((value) => value || null);

const emptyToNull = (value: unknown) =>
  value === "" || value == null ? null : Number(value);

export const listingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Must be 200 characters or fewer"),
  description: optionalText(5000),
  price: z.preprocess(
    emptyToNull,
    z
      .number({ error: "Enter a valid price" })
      .min(0, "Price can't be negative")
      .max(99_999_999, "Price is too large")
      .transform((value) => Math.round(value * 100) / 100)
  ),
  level: z.preprocess(
    emptyToNull,
    z
      .number({ error: "Enter a whole number" })
      .int("Enter a whole number")
      .min(0, "Level can't be negative")
      .max(1000, "Level is too high")
      .nullable()
  ),
  rank: optionalText(50),
  region: optionalText(50),
  highlights: z
    .array(z.string().trim().min(1).max(80, "Highlights must be 80 characters or fewer"))
    .max(20, "Add 20 highlights at most"),
  images: z
    .array(z.string().startsWith(LISTING_IMAGE_URL_PREFIX, "Invalid image"))
    .max(MAX_LISTING_IMAGES, `Add ${MAX_LISTING_IMAGES} images at most`),
  status: z.enum(EDITABLE_LISTING_STATUSES),
});

export type ListingInput = z.infer<typeof listingSchema>;

export function parseListingForm(formData: FormData) {
  return listingSchema.safeParse({
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    level: formData.get("level"),
    rank: formData.get("rank") ?? "",
    region: formData.get("region") ?? "",
    highlights: formData.getAll("highlights"),
    images: formData.getAll("images"),
    status: formData.get("status") ?? "available",
  });
}
