import { Suspense } from "react";
import Link from "next/link";
import { FlameIcon } from "lucide-react";
import { AccountLink } from "@/components/account-link";
import { MobileNav } from "@/components/mobile-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { PUBLIC_NAV, SELLER_CTA } from "@/lib/nav";

export function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-1.5 font-heading text-xl font-bold tracking-tight"
    >
      <FlameIcon className="size-5 fill-primary text-primary" aria-hidden />
      FireVault
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {PUBLIC_NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          ))}
          <Link
            href={SELLER_CTA.href}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {SELLER_CTA.label}
          </Link>
          <Suspense fallback={<Skeleton className="h-9 w-32" />}>
            <AccountLink />
          </Suspense>
        </nav>
        <MobileNav
          account={
            <Suspense fallback={null}>
              <AccountLink variant="menu" />
            </Suspense>
          }
        />
      </div>
    </header>
  );
}
