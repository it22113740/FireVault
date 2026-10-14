import { Badge } from "@/components/ui/badge";
import type { ListingStatus } from "@/src/lib/listings";

const variants = {
  available: "default",
  reserved: "secondary",
  sold: "outline",
  archived: "ghost",
} as const;

export function StatusBadge({ status }: { status: ListingStatus }) {
  return (
    <Badge variant={variants[status]} className="capitalize">
      {status}
    </Badge>
  );
}
