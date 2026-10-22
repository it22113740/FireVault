import { z } from "zod";
import { MAX_BANK_ACCOUNTS, bankAccountSchema } from "@/lib/payments";
import { passwordSchema, phoneSchema, toE164 } from "@/lib/validations/common";

// Empty turns eZ Cash off
const optionalPhoneSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || toE164(value) !== null, "Enter a valid phone number, e.g. 077 123 4567")
  .transform((value) => (value === "" ? "" : toE164(value)!));

const ezcashMessageSchema = z.string().trim().max(1000, "Keep it under 1,000 characters");

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
  // Top-up payment methods shown in the Buy dialog. Each one is optional;
  // with none set up, top-up buying is off.
  bankAccounts: z.array(bankAccountSchema).max(MAX_BANK_ACCOUNTS, `Add ${MAX_BANK_ACCOUNTS} bank accounts at most`),
  ezcashNumber: optionalPhoneSchema,
  ezcashMessageEn: ezcashMessageSchema,
  ezcashMessageSi: ezcashMessageSchema,
  ezcashMessageTa: ezcashMessageSchema,
  binancePayId: z.string().trim().regex(/^[0-9]{0,20}$/, "Use the numeric Binance Pay ID"),
  binanceName: z.string().trim().max(100, "Keep it under 100 characters"),
  // Sellers in the homepage "Want to sell account?" window, in order
  sellContactSellerIds: z.array(z.uuid("Choose sellers from the list")).max(30, "Choose up to 30 sellers"),
}).superRefine((value, ctx) => {
  // eZ Cash needs its instructions in all three languages
  if (value.ezcashNumber) {
    for (const field of ["ezcashMessageEn", "ezcashMessageSi", "ezcashMessageTa"] as const) {
      if (!value[field]) ctx.addIssue({ code: "custom", path: [field], message: "Write the message in all three languages" });
    }
  }
  if (!value.binancePayId !== !value.binanceName) {
    const field = value.binancePayId ? "binanceName" : "binancePayId";
    ctx.addIssue({ code: "custom", path: [field], message: "Fill in both Binance details, or leave both empty" });
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
