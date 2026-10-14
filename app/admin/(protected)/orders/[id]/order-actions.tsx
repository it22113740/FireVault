"use client";

import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/src/lib/orders";
import { setOrderStatus } from "../actions";

type Target = "paid" | "delivered" | "rejected";

const ACTIONS: Record<
  Target,
  { label: string; title: string; description: string; variant: "default" | "destructive" }
> = {
  paid: {
    label: "Mark paid",
    title: "Mark this order as paid?",
    description: "Confirm you've received the full payment. The listing stays reserved.",
    variant: "default",
  },
  delivered: {
    label: "Mark delivered",
    title: "Mark this order as delivered?",
    description:
      "Confirm you've sent the account login to the buyer. The listing will be marked sold.",
    variant: "default",
  },
  rejected: {
    label: "Reject order",
    title: "Reject this order?",
    description:
      "The listing goes back on sale. Refund the buyer yourself if they already paid.",
    variant: "destructive",
  },
};

export function OrderActions({ orderId, next }: { orderId: string; next: OrderStatus[] }) {
  const [error, setError] = useState<string | null>(null);
  const targets = next.filter((status): status is Target => status in ACTIONS);

  if (targets.length === 0) {
    return <p className="text-sm text-muted-foreground">No further actions for this order.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {targets.map((target) => (
          <ConfirmAction key={target} orderId={orderId} target={target} onError={setError} />
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function ConfirmAction({
  orderId,
  target,
  onError,
}: {
  orderId: string;
  target: Target;
  onError: (error: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const action = ACTIONS[target];

  function confirm() {
    startTransition(async () => {
      const result = await setOrderStatus(orderId, target);
      onError(result.error ?? null);
      setOpen(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={<Button variant={target === "rejected" ? "outline" : "default"} />}
      >
        {action.label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{action.title}</AlertDialogTitle>
          <AlertDialogDescription>{action.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={action.variant} disabled={pending} onClick={confirm}>
            {pending ? "Saving…" : action.label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
