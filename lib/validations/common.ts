import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email").max(254, "Enter a valid email"));

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use 72 characters or fewer");

// Store phones in E.164 so wa.me links always work. Local Sri Lankan numbers
// (077 123 4567) get +94; anything else must include its country code.
export function toE164(input: string, defaultCountryCode = "94"): string | null {
  const cleaned = input.replace(/[\s\-().]/g, "");
  let digits: string;
  if (cleaned.startsWith("+")) digits = cleaned.slice(1);
  else if (cleaned.startsWith("00")) digits = cleaned.slice(2);
  else if (cleaned.startsWith("0")) digits = defaultCountryCode + cleaned.slice(1);
  else digits = cleaned;

  return /^[1-9]\d{6,14}$/.test(digits) ? `+${digits}` : null;
}

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Enter a phone number")
  .refine((value) => toE164(value) !== null, "Enter a valid phone number, e.g. 077 123 4567")
  .transform((value) => toE164(value)!);

export const uuidSchema = z.uuid();

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

export const priceInputSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^\d{1,10}(\.\d{1,2})?$/.test(value.replace(/,/g, "")),
    "Enter a price like 15,000"
  );
