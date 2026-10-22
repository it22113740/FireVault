import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { homeFor, isPublicPath, isSuperAdminOnlyPath } from "@/lib/roles";
import { hasActiveAccess } from "@/lib/sales-admin-access";

const ONBOARDING_PATH = "/admin/onboarding";

// Runs on every page request:
//  * storefront pages are public; account and dashboard pages need login
//  * blocked customers and inactive/expired sales admins are signed out
//  * customers can't open /admin; sales admins can't open super-admin pages
//  * sales admins must create their shop profile before using /admin
// Pages and actions re-check with requireRole().
export async function proxy(request: NextRequest) {
  // This endpoint authenticates the scheduler using CRON_SECRET.
  if (request.nextUrl.pathname === "/api/cron/sales-admin-notifications") {
    return NextResponse.next();
  }
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
  const { pathname, search } = request.nextUrl;

  if (!profile) {
    // A login without a profile (e.g. a half-finished approval) is signed out
    if (userId) await supabase.auth.signOut();
    if (isPublicPath(pathname)) return response;
    const next = encodeURIComponent(`${pathname}${search}`);
    return redirectTo(pathname === "/" ? "/login" : `/login?next=${next}`, request, response);
  }

  if (!hasActiveAccess(profile)) {
    await supabase.auth.signOut();
    if (isPublicPath(pathname)) return response;
    if (profile.role === "customer") {
      return pathname === "/login" ? response : redirectTo("/login?blocked=1", request, response);
    }
    return pathname === "/inactive" ? response : redirectTo("/inactive", request, response);
  }

  if (pathname === "/login" || pathname === "/signup") {
    return redirectTo(homeFor(profile.role), request, response);
  }

  if (pathname.startsWith("/admin")) {
    if (profile.role === "customer") return redirectTo("/", request, response);
    if (profile.role === "sales_admin") {
      if (isSuperAdminOnlyPath(pathname)) return redirectTo("/admin", request, response);
      const { data: shop } = await supabase
        .from("seller_profiles")
        .select("id")
        .eq("id", userId!)
        .maybeSingle();
      if (!shop && pathname !== ONBOARDING_PATH) {
        return redirectTo(ONBOARDING_PATH, request, response);
      }
      if (shop && pathname === ONBOARDING_PATH) return redirectTo("/admin/shop", request, response);
    }
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
  // Every page; skips Next's assets and static files in /public
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)"],
};
