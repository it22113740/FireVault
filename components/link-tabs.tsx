import Link from "next/link";
import { cn } from "@/lib/utils";

export type LinkTab = { href: string; label: string; count?: number | null; active: boolean };

// URL-driven tabs: shareable, work without JS, and the URL updates instantly
export function LinkTabs({ tabs, label }: { tabs: LinkTab[]; label: string }) {
  return (
    <nav aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          scroll={false}
          aria-current={tab.active ? "page" : undefined}
          className={cn(
            "flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm transition-colors",
            tab.active
              ? "border-primary/50 bg-primary/10 font-medium text-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          {tab.label}
          {tab.count != null && (
            <span
              className={cn(
                "rounded-full px-1.5 text-xs tabular-nums",
                tab.active ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              {tab.count}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
