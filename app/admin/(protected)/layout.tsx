import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/src/lib/auth";
import { logout } from "../login/actions";
import { PageEnter } from "@/components/motion/page-enter";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading…</p>}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}

// Reads the session, so it must render inside the Suspense boundary
async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <nav className="flex items-center gap-4">
          <Link
            href="/admin"
            className="font-display text-xl leading-none font-bold font-stretch-[75%] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            FireVault
          </Link>
          <span className="text-sm text-muted-foreground">Admin</span>
          <Link href="/admin/orders" className="text-sm text-muted-foreground hover:text-foreground">
            Orders
          </Link>
          <Link href="/admin/posts" className="text-sm text-muted-foreground hover:text-foreground">
            Listings
          </Link>
        </nav>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </header>
      <main className="flex-1 p-4">
        <PageEnter>{children}</PageEnter>
      </main>
    </div>
  );
}
