"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type LinkTab = { href: string; label: string; count?: number | null; active: boolean };

// URL-driven tabs: shareable, work without JS, and the URL updates instantly.
// The active highlight slides between tabs (layout animation keyed by label).
export function LinkTabs({ tabs, label }: { tabs: LinkTab[]; label: string }) {
  const reduce = useReducedMotion();

  return (
    <nav aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          scroll={false}
          aria-current={tab.active ? "page" : undefined}
          className={cn(
            "relative flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm transition-colors active:scale-[0.97]",
            tab.active
              ? "border-primary/50 font-medium text-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          {tab.active && (
            <motion.span
              aria-hidden
              layoutId={`tabs-${label}`}
              className="absolute inset-0 -z-10 rounded-[inherit] bg-primary/10"
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
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
