"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setSalesAdminReview } from "@/lib/actions/sales-admins";

export function ReviewSwitch({ id, name, needsReview }: { id: string; name: string; needsReview: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(needsReview);
  const [, startTransition] = useTransition();

  // Optimistic: flips immediately, rolls back with a toast if the action fails
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
      <Switch
        checked={optimistic}
        onCheckedChange={(next) =>
          startTransition(async () => {
            setOptimistic(next);
            const result = await setSalesAdminReview(id, next);
            if (!result.ok) return void toast.error(result.error);
            toast.success(
              next
                ? `${name}'s listings now need your review.`
                : `${name}'s listings now go live without review.`
            );
          })
        }
        aria-label={`${name} listings need review`}
      />
      <span className="flex flex-col leading-tight">
        <span>{optimistic ? "Needs review" : "No review"}</span>
        <span className="text-xs text-muted-foreground">
          {optimistic ? "You approve listings" : "Listings go live directly"}
        </span>
      </span>
    </label>
  );
}
