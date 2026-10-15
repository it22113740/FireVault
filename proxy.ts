import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { isSuperAdminOnlyPath } from "@/lib/roles";
import { hasActiveAccess } from "@/lib/sales-admin-access";

// Auth + role + active-access gate (PLAN.md "Inactive sales admins"). Runs on
// every /admin request, so deactivating someone takes effect on their next
// click. Pages and actions re-check with requireRole().
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    }
  );

  // Also refreshes an expired session via setAll
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  const { data: profile } = userId
    ? await supabase.from("profiles").select("role, is_active, active_until").eq("id", userId).maybeSingle()
    : { data: null };

  // Deactivated, or their month of access has run out
  const inactive = !!profile && !hasActiveAccess(profile);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (!profile) {
      if (userId) await supabase.auth.signOut();
      return redirectTo("/login", request, response);
    }
    if (inactive) {
      await supabase.auth.signOut();
      return redirectTo("/inactive", request, response);
    }
    if (profile.role !== "super_admin" && isSuperAdminOnlyPath(pathname)) {
      return redirectTo("/admin", request, response);
    }
    return response;
  }

  if (pathname === "/login" && profile && !inactive) {
    return redirectTo("/admin", request, response);
  }
  if (pathname === "/inactive" && inactive) {
    await supabase.auth.signOut();
  }
  return response;
}

// Carry refreshed or cleared session cookies over to the redirect
function redirectTo(path: string, request: NextRequest, response: NextResponse) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/inactive"],
};
