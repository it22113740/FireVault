import { ArrowLeftRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Marks listings whose seller is open to swapping for another account
export function ExchangeBadge({ label = "Exchange", className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 text-xs font-medium whitespace-nowrap text-primary",
        className
      )}
    >
      <ArrowLeftRightIcon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}
