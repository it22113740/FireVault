import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { FlameIcon, LogOutIcon } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { Skeleton } from "@/components/ui/skeleton";
import { logout } from "@/lib/actions/auth";
import { requireStaff, type Profile } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { AdminMobileNav, AdminSidebarNav } from "./admin-nav";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · FireVault Admin" },
  robots: { index: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

// Reads the session, so it renders inside the Suspense boundary above
async function AdminShell({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff();
  const account = <AccountFooter profile={profile} />;

  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col gap-6 border-r bg-card/40 p-4 lg:flex">
        <AdminBrand />
        <AdminSidebarNav role={profile.role} />
        <div className="mt-auto">{account}</div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-2 backdrop-blur-md lg:hidden">
          <AdminMobileNav role={profile.role} footer={account} />
          <AdminBrand />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function AdminBrand() {
  return (
    <Link href="/admin" className="flex items-center gap-1.5 px-1 font-heading text-lg font-bold">
      <FlameIcon className="size-5 fill-primary text-primary" aria-hidden />
      FireVault <span className="font-normal text-muted-foreground">Admin</span>
    </Link>
  );
}

function AccountFooter({ profile }: { profile: Profile }) {
  return (
    <div className="flex items-center gap-2 border-t pt-4">
      <div className="min-w-0 flex-1 px-1">
        <p className="truncate text-sm font-medium">{profile.full_name}</p>
        <p className="text-xs text-muted-foreground">{ROLE_LABELS[profile.role]}</p>
      </div>
      <form action={logout}>
        <SubmitButton variant="ghost" size="icon-lg" pendingLabel="" aria-label="Log out">
          <LogOutIcon />
        </SubmitButton>
      </form>
    </div>
  );
}

function AdminShellSkeleton() {
  return (
    <div className="flex min-h-svh">
      <div className="hidden w-60 shrink-0 flex-col gap-3 border-r p-4 lg:flex">
        <Skeleton className="h-7 w-36" />
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-11" />
        ))}
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="h-8 w-48" />
      </div>
    </div>
  );
}
