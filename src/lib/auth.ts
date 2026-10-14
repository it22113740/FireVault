import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";

// Returns the user id if the session belongs to an admin, otherwise null.
// Shared by the proxy, the login action and requireAdmin().
export async function getAdminId(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return profile?.role === "admin" ? userId : null;
}

// Data Access Layer guard for admin pages and Server Actions. The proxy is a
// first line of defence only; every admin entry point must call this too.
export const requireAdmin = cache(async () => {
  const supabase = await createClient();
  const adminId = await getAdminId(supabase);
  if (!adminId) redirect("/admin/login");
  return { id: adminId };
});
