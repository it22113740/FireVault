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

// Storefront browsing is public; account and staff pages remain protected.
const PUBLIC_PATHS = [
  "/accounts",
  "/sellers",
  "/top-ups",
  "/updates",
  "/how-to-buy",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/confirm",
  "/inactive",
  "/apply",
];

export function isPublicPath(pathname: string) {
  return pathname === "/" || PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
