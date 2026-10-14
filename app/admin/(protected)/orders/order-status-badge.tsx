import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/src/lib/orders";

const variants = {
  pending: "secondary",
  paid: "default",
  delivered: "outline",
  rejected: "destructive",
  refunded: "ghost",
} as const;

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={variants[status]} className="capitalize">
      {status}
    </Badge>
  );
}
