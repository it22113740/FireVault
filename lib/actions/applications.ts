"use server";

import { createHmac, randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions/result";
import { logAudit } from "@/lib/audit";
import { requireSuperAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { toWebp } from "@/lib/images";
import { accessExpiryFromNow } from "@/lib/sales-admin-access";
import { APPLICATIONS_BUCKET } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { applicationSchema, denyApplicationSchema } from "@/lib/validations/application";
import { uuidSchema } from "@/lib/validations/common";

const RATE_LIMIT_PER_HOUR = 5;

async function clientIp() {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || null;
}

// Salted so the stored value can't be reversed to an IP address
function hashIp(ip: string) {
  return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update(ip).digest("hex");
}

// Public /apply form (PLAN.md Phase 3). Runs with the service role because
// applications have no public insert policy.
export async function submitApplication(formData: FormData): Promise<ActionResult> {
  const parsed = applicationSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    email: formData.get("email") ?? "",
    whatsappNumber: formData.get("whatsappNumber") ?? "",
    contactNumber: formData.get("contactNumber") ?? "",
  });
  if (!parsed.success) return invalid(parsed.error);
  const application = parsed.data;

  const ip = await clientIp();
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response"), ip))) {
    return fail("The security check failed. Please try again.");
  }

  const admin = createAdminClient();
  const ipHash = ip ? hashIp(ip) : null;

  if (ipHash) {
    const { count } = await admin
      .from("sales_admin_applications")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
    if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return fail("Too many applications from this network. Please try again later.");
    }
  }

  const [{ data: existingProfile }, { data: pending }] = await Promise.all([
    admin.from("profiles").select("id").eq("email", application.email).maybeSingle(),
    admin
      .from("sales_admin_applications")
      .select("id")
      .eq("email", application.email)
      .eq("status", "pending")
      .maybeSingle(),
  ]);
  if (existingProfile) {
    return fail("An account with this email already exists. Log in instead.");
  }
  if (pending) {
    return fail("You already have an application waiting for review with this email.");
  }

  const image = await toWebp(formData.get("screenshot"));
  if ("error" in image) {
    return { ok: false, error: image.error, fieldErrors: { screenshot: [image.error] } };
  }

  const { error: uploadError } = await admin.storage
    .from(APPLICATIONS_BUCKET)
    .upload(image.path, image.body, { contentType: "image/webp" });
  if (uploadError) return fail("Couldn't upload your screenshot. Please try again.");

  const { error } = await admin.from("sales_admin_applications").insert({
    full_name: application.fullName,
    email: application.email,
    whatsapp_number: application.whatsappNumber,
    contact_number: application.contactNumber,
    screenshot_path: image.path,
    ip_hash: ipHash,
  });

  if (error) {
    await admin.storage.from(APPLICATIONS_BUCKET).remove([image.path]);
    // 23505: one_pending_application_per_email (a parallel submit won the race)
    return fail(
      error.code === "23505"
        ? "You already have an application waiting for review with this email."
        : "Couldn't submit your application. Please try again."
    );
  }

  redirect("/apply/success");
}

// PLAN.md "Sales admin approval" steps 1–5, with rollback of the auth user
// if anything after creating it fails, so the approval can be retried.
export async function approveApplication(id: string): Promise<ActionResult> {
  const reviewer = await requireSuperAdmin();
  if (!uuidSchema.safeParse(id).success) return fail("Application not found.");

  const supabase = await createClient();
  const { data: application } = await supabase
    .from("sales_admin_applications")
    .select("*")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();
  if (!application) return fail("This application was already reviewed. Refresh the page.");

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", application.email)
    .maybeSingle();
  if (existing) return fail("A user with this email already exists. Deny the application instead.");

  // Step 1: login with a random password nobody knows; they set their own
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: application.email,
    password: randomBytes(24).toString("base64url"),
    email_confirm: true,
    user_metadata: { full_name: application.full_name },
  });
  if (createError || !created.user) {
    return fail(
      createError?.code === "email_exists"
        ? "This email already has a login (without a seller profile). Remove it in Supabase Auth, then approve again."
        : "Couldn't create the login. Please try again."
    );
  }
  const userId = created.user.id;

  try {
    // Step 2: seller profile copied from the application
    const { error: profileError } = await admin.from("profiles").insert({
      id: userId,
      role: "sales_admin",
      full_name: application.full_name,
      email: application.email,
      whatsapp_number: application.whatsapp_number,
      contact_number: application.contact_number,
      is_active: true,
      active_until: accessExpiryFromNow(),
    });
    if (profileError) throw new Error(profileError.message);

    // Step 3: reset email so they choose their own password
    const { error: emailError } = await admin.auth.resetPasswordForEmail(application.email, {
      redirectTo: `${SITE_URL}/auth/confirm?next=/reset-password`,
    });
    if (emailError) throw new Error(emailError.message);

    // Step 4: mark approved (guarded so a parallel review can't double-approve)
    const { data: updated, error: updateError } = await supabase
      .from("sales_admin_applications")
      .update({
        status: "approved",
        user_id: userId,
        reviewed_by: reviewer.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "pending")
      .select("id");
    if (updateError || updated.length === 0) {
      throw new Error(updateError?.message ?? "Application was already reviewed");
    }
  } catch (error) {
    // Deleting the auth user cascades to the profile
    await admin.auth.admin.deleteUser(userId);
    console.error("Approval rolled back:", error);
    return fail("Approval failed and was rolled back. Please try again.");
  }

  await logAudit(reviewer.id, "application.approve", id, { user_id: userId });
  refresh();
  return ok();
}

export async function denyApplication(
  id: string,
  reason: string
): Promise<ActionResult<{ emailed: boolean }>> {
  const reviewer = await requireSuperAdmin();
  const parsed = denyApplicationSchema.safeParse({ id, reason });
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data: application } = await supabase
    .from("sales_admin_applications")
    .update({
      status: "denied",
      deny_reason: parsed.data.reason || null,
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
    .eq("status", "pending")
    .select("email, full_name")
    .maybeSingle();
  if (!application) return fail("This application was already reviewed. Refresh the page.");

  const emailed = await sendEmail({
    to: application.email,
    subject: "Your FireVault seller application",
    text: [
      `Hi ${application.full_name},`,
      "",
      "Thanks for applying to sell on FireVault. Unfortunately your application wasn't approved this time.",
      ...(parsed.data.reason ? ["", `Reason: ${parsed.data.reason}`] : []),
      "",
      "— FireVault",
    ].join("\n"),
  });

  await logAudit(reviewer.id, "application.deny", parsed.data.id, {
    reason: parsed.data.reason || null,
    emailed,
  });
  refresh();
  return ok({ emailed });
}
