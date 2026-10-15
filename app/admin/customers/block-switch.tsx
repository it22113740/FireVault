"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { setCustomerActive } from "@/lib/actions/customers";

export function BlockSwitch({ id, name, active }: { id: string; name: string; active: boolean }) {
  const [optimisticActive, setOptimisticActive] = useOptimistic(active);
  const [, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Optimistic: flips immediately, rolls back with a toast if the action fails
  async function apply(next: boolean) {
    setOptimisticActive(next);
    const result = await setCustomerActive(id, next);
    if (result.ok) toast.success(next ? `${name} is unblocked.` : `${name} is blocked.`);
    else toast.error(result.error);
    return result.ok;
  }

  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
      <Switch
        checked={optimisticActive}
        onCheckedChange={(next) => {
          if (!next) return setConfirmOpen(true);
          startTransition(async () => {
            await apply(true);
          });
        }}
        aria-label={`${name} can log in`}
      />
      <span className={optimisticActive ? "text-success" : "text-destructive"}>
        {optimisticActive ? "Active" : "Blocked"}
      </span>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Block ${name}?`}
        description="They'll be signed out and can't log in or leave feedback. Their existing reviews stay up; delete them from the seller's page if needed."
        confirmLabel="Block"
        pendingLabel="Blocking…"
        onConfirm={() => apply(false)}
      />
    </label>
  );
}
