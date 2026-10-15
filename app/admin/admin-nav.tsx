"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheckIcon,
  GemIcon,
  LayoutDashboardIcon,
  ListIcon,
  MenuIcon,
  MegaphoneIcon,
  SettingsIcon,
  StoreIcon,
  UserCircleIcon,
  UserPlusIcon,
  UserRoundIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/roles";

type NavItem = { href: string; label: string; icon: LucideIcon; roles: Role[] };

const BOTH: Role[] = ["super_admin", "sales_admin"];
const SUPER: Role[] = ["super_admin"];
const SELLER: Role[] = ["sales_admin"];

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboardIcon, roles: BOTH },
  { href: "/admin/shop", label: "My shop", icon: StoreIcon, roles: SELLER },
  { href: "/admin/listings", label: "Listings", icon: ListIcon, roles: BOTH },
  { href: "/admin/review", label: "Review queue", icon: ClipboardCheckIcon, roles: SUPER },
  { href: "/admin/applications", label: "Applications", icon: UserPlusIcon, roles: SUPER },
  { href: "/admin/sales-admins", label: "Sales admins", icon: UsersIcon, roles: SUPER },
  { href: "/admin/customers", label: "Customers", icon: UserRoundIcon, roles: SUPER },
  { href: "/admin/top-ups", label: "Top-ups", icon: GemIcon, roles: SUPER },
  { href: "/admin/announcements", label: "Announcements", icon: MegaphoneIcon, roles: SUPER },
  { href: "/admin/settings", label: "Settings", icon: SettingsIcon, roles: SUPER },
  { href: "/admin/profile", label: "Profile", icon: UserCircleIcon, roles: BOTH },
];

function NavLinks({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.filter((item) => item.roles.includes(role)).map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
              active
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            )}
          >
            <Icon className={cn("size-4", active && "text-primary")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminSidebarNav({ role }: { role: Role }) {
  return <NavLinks role={role} />;
}

export function AdminMobileNav({ role, footer }: { role: Role; footer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon-lg" />} aria-label="Open menu">
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col gap-6 p-4">
        <SheetTitle className="px-3 font-heading text-lg">FireVault Admin</SheetTitle>
        <NavLinks role={role} onNavigate={() => setOpen(false)} />
        <div className="mt-auto">{footer}</div>
      </SheetContent>
    </Sheet>
  );
}
