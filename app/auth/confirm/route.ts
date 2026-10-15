import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validations/auth";

// Landing point for Supabase email links (password reset, sign-up
// confirmation, approval setup links). Handles both link styles:
//   ?token_hash=…&type=…  (email templates from README; works on any device)
//   ?code=…               (default PKCE link; same browser only)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  const supabase = await createClient();
  const { error } = tokenHash && type
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error("Missing token") };

  if (error) {
    // Expired or reused: reset links go back to request a new one
    const target = type === "recovery" || next === "/reset-password" ? "/forgot-password?expired=1" : "/login?expired=1";
    return NextResponse.redirect(new URL(target, origin));
  }
  return NextResponse.redirect(new URL(next, origin));
}
