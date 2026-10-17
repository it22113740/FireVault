import Link from "next/link";
import { Logo } from "@/components/site-header";
import { PUBLIC_NAV, SELLER_CTA } from "@/lib/nav";

// Sellers stays reachable from the footer though it's not in the top nav
const LINKS = [...PUBLIC_NAV, { href: "/sellers", label: "Sellers" }, SELLER_CTA, { href: "/login", label: "Seller login" }];

export function SiteFooter() {
  return (
    <footer className="border-t font-medium">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Game accounts and top-up packs. Every purchase happens on WhatsApp with
            manual payment.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Support: <a href="mailto:subanofficial14@gmail.com" className="break-all hover:text-foreground">subanofficial14@gmail.com</a>
          </p>
        </div>
        <nav className="grid grid-cols-2 gap-x-8 gap-y-2 text-base">
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="text-muted-foreground hover:text-foreground">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="border-t px-4 py-4 text-center text-sm text-muted-foreground">
        Independent marketplace. Not affiliated with or endorsed by any game publisher.
      </p>
    </footer>
  );
}
