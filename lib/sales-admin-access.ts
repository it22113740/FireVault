import type { Tables } from "@/lib/database.types";

// Each activation grants one month of access (see migration
// 20261016000000_sales_admin_expiry.sql, which enforces the same rule in RLS)
export const ACCESS_PERIOD_MONTHS = 1;

export function accessExpiryFromNow(now = new Date()) {
  const until = new Date(now);
  until.setMonth(until.getMonth() + ACCESS_PERIOD_MONTHS);
  return until.toISOString();
}

type AccessFields = Pick<Tables<"profiles">, "role" | "is_active" | "active_until">;

// Super admins never expire; customers are active unless blocked; sales admins
// need is_active and an unexpired month
export function hasActiveAccess(profile: AccessFields, now = new Date()) {
  if (profile.role === "super_admin") return true;
  if (profile.role === "customer") return profile.is_active;
  return profile.is_active && !!profile.active_until && new Date(profile.active_until) > now;
}

// Whole days left until access ends (0 or less once expired)
export function accessDaysLeft(activeUntil: string, now = new Date()) {
  return Math.ceil((new Date(activeUntil).getTime() - now.getTime()) / 86_400_000);
}
