import Link from "next/link";
import { PageEnter } from "@/components/motion/page-enter";

const links = [
  ["/#accounts", "Accounts"],
  ["/#services", "Services"],
  ["/#reviews", "Reviews"],
  ["/#support", "Support"],
] as const;

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4">
          <Link
            href="/"
            className="font-display text-2xl leading-none font-bold font-stretch-[75%] tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            FireVault
          </Link>
          <nav className="flex items-center gap-4 overflow-x-auto text-sm sm:gap-6">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="shrink-0 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="flex-1">
        <PageEnter>{children}</PageEnter>
      </div>
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:justify-between">
          <div className="max-w-[36ch]">
            <p className="font-display text-2xl leading-none font-bold font-stretch-[75%]">
              FireVault
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Accounts that are already played in. The login is sent after the payment
              is confirmed.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {[...links, ["/#how-it-works", "How it works"] as const].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-t">
          <p className="mx-auto max-w-6xl px-4 py-4 text-xs leading-relaxed text-muted-foreground">
            © FireVault. Independent marketplace, not affiliated with or endorsed by any
            game publisher.
          </p>
        </div>
      </footer>
    </div>
  );
}
