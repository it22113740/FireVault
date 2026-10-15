import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Read-only stars; fractional values partly fill the last star
export function StarRating({
  value,
  className,
  size = "size-4",
}: {
  value: number;
  className?: string;
  size?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, value - (star - 1)));
        return (
          <span key={star} className={cn("relative inline-block", size)} aria-hidden>
            <StarIcon className={cn("absolute inset-0 text-muted-foreground/40", size)} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <StarIcon className={cn("fill-warning text-warning", size)} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
