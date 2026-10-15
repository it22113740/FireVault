import { z } from "zod";
import { emailSchema, phoneSchema } from "@/lib/validations/common";
import { shopSchema } from "@/lib/validations/shop";

export const applicationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100, "Name is too long"),
  email: emailSchema,
  whatsappNumber: phoneSchema,
  whatsappGroupUrl: shopSchema.shape.whatsappGroupUrl.refine((value) => {
    if (!value) return false;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password && !url.port && /^\/[A-Za-z0-9_-]+\/?$/.test(url.pathname);
    } catch {
      return false;
    }
  }, "Enter a WhatsApp group invite link like https://chat.whatsapp.com/yourInviteCode"),
  contactNumber: phoneSchema,
});
export type ApplicationInput = z.input<typeof applicationSchema>;

export const denyApplicationSchema = z.object({
  id: z.uuid(),
  reason: z.string().trim().max(500, "Keep the reason under 500 characters"),
});
