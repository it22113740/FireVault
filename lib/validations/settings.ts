import { z } from "zod";
import { passwordSchema, phoneSchema } from "@/lib/validations/common";

export const settingsSchema = z.object({
  adminWhatsapp: phoneSchema,
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code, e.g. LKR"),
  inactiveMessage: z
    .string()
    .trim()
    .min(10, "Write a short message for inactive sellers")
    .max(500, "Keep the message under 500 characters"),
  // Edited as "IND, SG, BD"; stored as a de-duplicated list of codes
  regions: z
    .string()
    .transform((value) =>
      [...new Set(value.split(/[,\n]/).map((region) => region.trim().toUpperCase()).filter(Boolean))]
    )
    .pipe(
      z
        .array(z.string().regex(/^[A-Z0-9]{2,10}$/, "Region codes are 2–10 letters or numbers"))
        .min(1, "Add at least one region")
        .max(30, "Add 30 regions at most")
    ),
});
export type SettingsInput = z.input<typeof settingsSchema>;
export type SettingsOutput = z.output<typeof settingsSchema>;

export const contactDetailsSchema = z.object({
  whatsappNumber: phoneSchema,
  contactNumber: phoneSchema,
});
export type ContactDetailsInput = z.input<typeof contactDetailsSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
