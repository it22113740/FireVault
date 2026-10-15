import { z } from "zod";

export const SHOP_LIMITS = { name: 60, description: 2000 } as const;

// "Banzzz•23 Store" -> "banzzz-23-store"
export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

// Accepts links pasted with or without https://; stores them as https only
function linkSchema(hosts: RegExp, example: string) {
  return z
    .string()
    .trim()
    .transform((value) => (value && !/^https?:\/\//i.test(value) ? `https://${value}` : value))
    .transform((value) => value.replace(/^http:\/\//i, "https://"))
    .refine((value) => {
      if (!value) return true;
      try {
        return hosts.test(new URL(value).hostname);
      } catch {
        return false;
      }
    }, `Paste a link like ${example}`);
}

export const shopSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Enter your shop name")
    .max(SHOP_LIMITS.name, `Keep the name under ${SHOP_LIMITS.name} characters`),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/,
      "Use 3–40 lowercase letters, numbers or dashes"
    ),
  description: z
    .string()
    .trim()
    .max(SHOP_LIMITS.description, `Keep the description under ${SHOP_LIMITS.description} characters`),
  whatsappGroupUrl: linkSchema(/^chat\.whatsapp\.com$/, "https://chat.whatsapp.com/…"),
  tiktokUrl: linkSchema(/^((www|vm|m)\.)?tiktok\.com$/, "https://www.tiktok.com/@yourshop"),
  facebookUrl: linkSchema(/^((www|m|web)\.)?(facebook\.com|fb\.com|fb\.me)$/, "https://facebook.com/yourshop"),
  totalSold: z
    .string()
    .trim()
    .refine((value) => /^\d{1,7}$/.test(value.replace(/,/g, "")), "Enter a whole number")
    .transform((value) => Number(value.replace(/,/g, "")))
    .pipe(z.number().int().min(0).max(1_000_000, "That number is too large")),
});
export type ShopInput = z.input<typeof shopSchema>;
export type ShopOutput = z.output<typeof shopSchema>;
