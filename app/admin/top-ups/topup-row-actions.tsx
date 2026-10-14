"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDownIcon, ArrowUpIcon, EyeIcon, EyeOffIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { deleteTopup, moveTopup, setTopupPublished } from "@/lib/actions/topups";
import type { ActionResult } from "@/lib/actions/result";

export function TopupRowActions({
  id,
  name,
  published,
  isFirst,
  isLast,
}: {
  id: string;
  name: string;
  published: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function run(action: () => Promise<ActionResult>, success?: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.error);
      else if (success) toast.success(success);
    });
  }

  return (
    <div className="flex flex-wrap gap-1">
      <Button
        variant="ghost"
        size="icon-lg"
        disabled={pending || isFirst}
        onClick={() => run(() => moveTopup(id, "up"))}
        aria-label={`Move ${name} up`}
      >
        <ArrowUpIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-lg"
        disabled={pending || isLast}
        onClick={() => run(() => moveTopup(id, "down"))}
        aria-label={`Move ${name} down`}
      >
        <ArrowDownIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-lg"
        disabled={pending}
        onClick={() =>
          run(
            () => setTopupPublished(id, !published),
            published ? `${name} unpublished.` : `${name} is live.`
          )
        }
        aria-label={published ? `Unpublish ${name}` : `Publish ${name}`}
        title={published ? "Unpublish" : "Publish"}
      >
        {published ? <EyeOffIcon /> : <EyeIcon />}
      </Button>
      <Button
        variant="ghost"
        size="icon-lg"
        render={<Link href={`/admin/top-ups/${id}/edit`} />}
        nativeButton={false}
        aria-label={`Edit ${name}`}
      >
        <PencilIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-lg"
        disabled={pending}
        onClick={() => setConfirmDelete(true)}
        aria-label={`Delete ${name}`}
      >
        <Trash2Icon />
      </Button>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${name}?`}
        description="The pack and its image will be deleted. To hide it for now, unpublish it instead."
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        onConfirm={async () => {
          const result = await deleteTopup(id);
          if (result.ok) toast.success(`${name} deleted.`);
          else toast.error(result.error);
          return result.ok;
        }}
      />
    </div>
  );
}
