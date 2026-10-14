import { cn } from "@/lib/utils";
import {
  AVAILABILITY_LABELS,
  PUBLISH_STATUS_LABELS,
  type Availability,
  type PublishStatus,
} from "@/lib/listings";

const base =
  "inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap transition-colors duration-200";

const PUBLISH_STYLES: Record<PublishStatus, string> = {
  draft: "border-border bg-muted text-muted-foreground",
  pending_review: "border-primary/30 bg-primary/10 text-primary",
  published: "border-success/30 bg-success/10 text-success",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
  archived: "border-border bg-transparent text-muted-foreground",
};

export function PublishStatusBadge({ status }: { status: PublishStatus }) {
  return <span className={cn(base, PUBLISH_STYLES[status])}>{PUBLISH_STATUS_LABELS[status]}</span>;
}

// Green for Available, amber for Reserved (PLAN.md design direction)
export function AvailabilityBadge({
  availability,
  className,
}: {
  availability: Availability;
  className?: string;
}) {
  return (
    <span
      className={cn(
        base,
        availability === "available"
          ? "border-success/30 bg-success/10 text-success"
          : "border-warning/30 bg-warning/10 text-warning",
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {AVAILABILITY_LABELS[availability]}
    </span>
  );
}
