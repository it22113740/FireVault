"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { AvailabilityBadge } from "@/components/status-badge";
import { setAvailability } from "@/lib/actions/listings";
import type { Availability } from "@/lib/listings";

// Instant, no review needed. Optimistic with rollback + toast on failure.
export function AvailabilityToggle({ id, availability }: { id: string; availability: Availability }) {
  const [optimistic, setOptimistic] = useOptimistic(availability);
  const [, startTransition] = useTransition();
  const next: Availability = optimistic === "available" ? "reserved" : "available";

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          setOptimistic(next);
          const result = await setAvailability(id, next);
          if (!result.ok) toast.error(result.error);
        })
      }
      className="flex min-h-11 items-center rounded-lg transition-transform active:scale-[0.97]"
      aria-label={`Mark as ${next}`}
      title={`Mark as ${next}`}
    >
      <AvailabilityBadge availability={optimistic} className="cursor-pointer" />
    </button>
  );
}
