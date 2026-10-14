"use client";

import { createContext, use, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

type FilterNavigation = {
  pending: boolean;
  apply: (changes: Record<string, string | undefined>) => void;
};

const FilterNavigationContext = createContext<FilterNavigation | null>(null);

// Shares one transition between the filters and the results, so the old
// results dim while new ones load and the URL updates instantly
export function FilterNavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function apply(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    // Any filter change starts again from page 1
    if (!("page" in changes)) next.delete("page");
    const query = next.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  return <FilterNavigationContext value={{ pending, apply }}>{children}</FilterNavigationContext>;
}

export function useFilterNavigation() {
  const context = use(FilterNavigationContext);
  if (!context) throw new Error("useFilterNavigation must be used inside FilterNavigationProvider");
  return context;
}

export function FilteredResults({ children }: { children: React.ReactNode }) {
  const { pending } = useFilterNavigation();
  return (
    <div className="relative" aria-busy={pending}>
      <div className={cn("transition-opacity duration-200", pending && "pointer-events-none opacity-60")}>
        {children}
      </div>
      {pending && (
        <Loader2Icon
          className="absolute top-8 left-1/2 size-6 -translate-x-1/2 animate-spin text-primary"
          aria-label="Loading"
        />
      )}
    </div>
  );
}
