import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Tables } from "@/lib/database.types";
import type { Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type Profile = Tables<"profiles">;

// One session + profile read per request, shared by layouts, pages and actions
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return profile;
});

// Guard for admin pages and every Server Action. proxy.ts is only the first
// line of defence; this re-checks role and is_active on the server.
export async function requireRole(...roles: Role[]): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role === "sales_admin" && !profile.is_active) redirect("/inactive");
  if (roles.length > 0 && !roles.includes(profile.role)) redirect("/admin");
  return profile;
}

export const requireStaff = () => requireRole("super_admin", "sales_admin");
export const requireSuperAdmin = () => requireRole("super_admin");
