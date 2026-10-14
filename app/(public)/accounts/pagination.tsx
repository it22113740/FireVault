"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFilterNavigation } from "./filter-navigation";

export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const { apply, pending } = useFilterNavigation();
  if (totalPages <= 1) return null;

  const go = (target: number) => {
    apply({ page: target > 1 ? String(target) : undefined });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-3">
      <Button
        variant="outline"
        size="lg"
        className="h-11"
        disabled={page <= 1 || pending}
        onClick={() => go(page - 1)}
      >
        <ChevronLeftIcon /> Previous
      </Button>
      <span className="text-sm text-muted-foreground tabular-nums">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="lg"
        className="h-11"
        disabled={page >= totalPages || pending}
        onClick={() => go(page + 1)}
      >
        Next <ChevronRightIcon />
      </Button>
    </nav>
  );
}
