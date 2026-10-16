import type { Enums } from "@/lib/database.types";

export type Role = Enums<"user_role">;

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super admin",
  sales_admin: "Sales admin",
  customer: "Customer",
};

export const STAFF_ROLES: Role[] = ["super_admin", "sales_admin"];

export function isStaff(role: Role) {
  return STAFF_ROLES.includes(role);
}

// Where each role lands after logging in
export function homeFor(role: Role) {
  return isStaff(role) ? "/admin" : "/";
}

// Admin sections only the super admin may open. Checked in proxy.ts on every
// request and again by requireRole() in each page and action.
export const SUPER_ADMIN_ONLY_PATHS = [
  "/admin/review",
  "/admin/applications",
  "/admin/sales-admins",
  "/admin/customers",
  "/admin/top-ups",
  "/admin/orders",
  "/admin/updates",
  "/admin/settings",
];

export function isSuperAdminOnlyPath(pathname: string) {
  return SUPER_ADMIN_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

// Pages anyone can open without logging in. Everything else, including the
// store itself, requires an account (customers sign up at /signup).
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/confirm",
  "/inactive",
  "/apply",
];

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
