"use server";

import { updateTag } from "next/cache";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions/result";
import { logAudit } from "@/lib/audit";
import { requireStaff, requireSuperAdmin } from "@/lib/auth";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { createClient } from "@/lib/supabase/server";
import {
  changePasswordSchema,
  contactDetailsSchema,
  settingsSchema,
  type ChangePasswordInput,
  type ContactDetailsInput,
  type SettingsInput,
} from "@/lib/validations/settings";

export async function updateSettings(input: SettingsInput): Promise<ActionResult> {
  const actor = await requireSuperAdmin();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({
      admin_whatsapp: parsed.data.adminWhatsapp,
      currency: parsed.data.currency,
      inactive_message: parsed.data.inactiveMessage,
      regions: parsed.data.regions,
    })
    .eq("id", 1);
  if (error) return fail("Couldn't save the settings. Please try again.");

  await logAudit(actor.id, "settings.update", null, {
    currency: parsed.data.currency,
    regions: parsed.data.regions,
  });
  updateTag(CACHE_TAGS.settings);
  // Listings carry the admin WhatsApp number for super admin listings
  updateTag(CACHE_TAGS.listings);
  return ok();
}

// Sales admins keep their own WhatsApp/contact numbers current; buyers of
// their listings are sent to this WhatsApp number
export async function updateContactDetails(input: ContactDetailsInput): Promise<ActionResult> {
  const profile = await requireStaff();
  const parsed = contactDetailsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      whatsapp_number: parsed.data.whatsappNumber,
      contact_number: parsed.data.contactNumber,
    })
    .eq("id", profile.id);
  if (error) return fail("Couldn't save your details. Please try again.");

  updateTag(CACHE_TAGS.listings);
  return ok();
}

export async function changePassword(input: ChangePasswordInput): Promise<ActionResult> {
  const profile = await requireStaff();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  // Re-verify the current password so an unattended session can't change it
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: parsed.data.currentPassword,
  });
  if (verifyError) {
    return {
      ok: false,
      error: "Your current password is incorrect.",
      fieldErrors: { currentPassword: ["Incorrect password"] },
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return fail(
      error.code === "same_password"
        ? "Choose a password you haven't used before."
        : "Couldn't change your password. Please try again."
    );
  }
  return ok();
}
