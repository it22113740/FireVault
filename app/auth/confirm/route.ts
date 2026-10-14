import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Landing point for password-reset emails. Handles both link styles:
//   ?token_hash=…&type=recovery  (email template from README; works on any device)
//   ?code=…                      (default PKCE link; same browser only)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  const supabase = await createClient();
  const { error } = tokenHash && type
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error("Missing token") };

  if (error) {
    return NextResponse.redirect(new URL("/forgot-password?expired=1", origin));
  }
  return NextResponse.redirect(new URL(next, origin));
}

// Only same-site paths, never "//evil.com"
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
}
