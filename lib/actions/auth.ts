"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions/result";
import { homeFor } from "@/lib/roles";
import { hasActiveAccess } from "@/lib/sales-admin-access";
import { SITE_URL } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import {
  forgotPasswordSchema,
  loginSchema,
  newPasswordSchema,
  safeNextPath,
  signupSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type NewPasswordInput,
  type SignupInput,
} from "@/lib/validations/auth";


export async function login(input: LoginInput, next?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return fail(
      error.code === "email_not_confirmed"
        ? "Confirm your email first. Check your inbox for the link we sent."
        : "Invalid email or password."
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, active_until")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return fail("This account isn't set up yet. Please contact us.");
  }
  if (!hasActiveAccess(profile)) {
    await supabase.auth.signOut();
    if (profile.role === "customer") {
      return fail("This account has been blocked. Please contact us if you think this is a mistake.");
    }
    redirect("/inactive");
  }

  // Customers go back to the page they wanted; staff to the dashboard
  redirect(profile.role === "customer" ? safeNextPath(next) : homeFor(profile.role));
}

// Customer sign-up. Supabase emails a confirmation link (through
// /auth/confirm) when email confirmation is on; otherwise they're signed in.
export async function signup(
  input: SignupInput,
  turnstileToken: string | null
): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { fullName, email, password } = parsed.data;

  const forwarded = (await headers()).get("x-forwarded-for");
  if (!(await verifyTurnstile(turnstileToken, forwarded?.split(",")[0]?.trim() || null))) {
    return fail("The security check failed. Please try again.");
  }

  const admin = createAdminClient();
  const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) return fail("An account with this email already exists. Log in instead.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${SITE_URL}/auth/confirm?next=/`,
    },
  });
  if (error) {
    if (error.status === 429) return fail("Too many sign-ups right now. Please try again in a few minutes.");
    if (error.code === "weak_password") return fail("Choose a stronger password.");
    return fail("Couldn't create your account. Please try again.");
  }
  // An already-registered email comes back with no identities (no error, by design)
  if (!data.user || data.user.identities?.length === 0) {
    return fail("An account with this email already exists. Log in instead.");
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    role: "customer",
    full_name: fullName,
    email,
    is_active: true,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return fail("Couldn't create your account. Please try again.");
  }

  return ok({ needsConfirmation: !data.session });
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_URL}/auth/confirm?next=/reset-password`,
  });
  // Only rate limiting is worth reporting; never reveal whether the email exists
  if (error?.status === 429) {
    return fail("Too many requests. Please wait a few minutes and try again.");
  }
  return ok();
}

export async function setNewPassword(input: NewPasswordInput): Promise<ActionResult> {
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) {
    return fail("Your reset link has expired. Request a new one.");
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return fail(
      error.code === "same_password"
        ? "Choose a password you haven't used before."
        : "Couldn't update your password. Please try again."
    );
  }
  return ok();
}
