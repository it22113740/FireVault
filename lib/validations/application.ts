import { z } from "zod";
import { emailSchema, phoneSchema } from "@/lib/validations/common";

export const applicationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100, "Name is too long"),
  email: emailSchema,
  whatsappNumber: phoneSchema,
  contactNumber: phoneSchema,
});
export type ApplicationInput = z.input<typeof applicationSchema>;

export const denyApplicationSchema = z.object({
  id: z.uuid(),
  reason: z.string().trim().max(500, "Keep the reason under 500 characters"),
});
