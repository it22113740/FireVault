import type { Enums } from "@/lib/database.types";

export type Role = Enums<"user_role">;

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super admin",
  sales_admin: "Sales admin",
};

// Admin sections only the super admin may open. Checked in proxy.ts on every
// request and again by requireRole() in each page and action.
export const SUPER_ADMIN_ONLY_PATHS = [
  "/admin/review",
  "/admin/applications",
  "/admin/sales-admins",
  "/admin/top-ups",
  "/admin/settings",
];

export function isSuperAdminOnlyPath(pathname: string) {
  return SUPER_ADMIN_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}
