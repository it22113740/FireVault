"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { setSalesAdminActive } from "@/lib/actions/sales-admins";

export function ActiveSwitch({ id, name, active }: { id: string; name: string; active: boolean }) {
  const [optimisticActive, setOptimisticActive] = useOptimistic(active);
  const [, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Optimistic: flips immediately, rolls back with a toast if the action fails
  async function apply(next: boolean) {
    setOptimisticActive(next);
    const result = await setSalesAdminActive(id, next);
    if (result.ok) {
      toast.success(next ? `${name} can log in again.` : `${name} is now inactive.`);
    } else {
      toast.error(result.error);
    }
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
        aria-label={`${name} active`}
      />
      <span className={optimisticActive ? "text-success" : "text-muted-foreground"}>
        {optimisticActive ? "Active" : "Inactive"}
      </span>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Deactivate ${name}?`}
        description="They'll be signed out on their next click and see the payment message when they try to log in. Their live listings stay up."
        confirmLabel="Deactivate"
        pendingLabel="Deactivating…"
        onConfirm={() => apply(false)}
      />
    </label>
  );
}
