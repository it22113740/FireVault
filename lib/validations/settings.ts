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
  // Bank account top-up buyers pay into (shown in the Buy dialog). All four
  // are optional together; leaving them empty turns top-up buying off.
  bankAccountName: z.string().trim().max(100, "Keep it under 100 characters"),
  bankAccountNumber: z
    .string()
    .trim()
    .regex(/^[0-9 -]{0,30}$/, "Use digits only (spaces and dashes are fine)"),
  bankName: z.string().trim().max(100, "Keep it under 100 characters"),
  bankBranch: z.string().trim().max(100, "Keep it under 100 characters"),
  // Sellers in the homepage "Want to sell account?" window, in order
  sellContactSellerIds: z.array(z.uuid("Choose sellers from the list")).max(30, "Choose up to 30 sellers"),
}).superRefine((value, ctx) => {
  const fields = ["bankAccountName", "bankAccountNumber", "bankName", "bankBranch"] as const;
  const filled = fields.filter((field) => value[field] !== "");
  if (filled.length === 0 || filled.length === fields.length) return;
  for (const field of fields) {
    if (value[field] === "") ctx.addIssue({ code: "custom", path: [field], message: "Fill in all bank details, or leave them all empty" });
  }
});
export type SettingsInput = z.input<typeof settingsSchema>;
export type SettingsOutput = z.output<typeof settingsSchema>;

export const nameSchema = z.string().trim().min(2, "Enter your name").max(100, "Name is too long");

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
