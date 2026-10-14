"use client";

import { useState } from "react";
import Link from "next/link";
import { ArchiveIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { archiveListing, deleteListing } from "@/lib/actions/listings";
import type { PublishStatus } from "@/lib/listings";

export function ListingRowActions({
  id,
  title,
  status,
  editable,
}: {
  id: string;
  title: string;
  status: PublishStatus;
  editable: boolean;
}) {
  const [dialog, setDialog] = useState<"archive" | "delete" | null>(null);
  const deletable = status === "draft" || status === "rejected";

  async function run(action: (id: string) => ReturnType<typeof archiveListing>, success: string) {
    const result = await action(id);
    if (result.ok) toast.success(success);
    else toast.error(result.error);
    return result.ok;
  }

  return (
    <div className="flex gap-1">
      {editable && (
        <Button
          variant="ghost"
          size="icon-lg"
          render={<Link href={`/admin/listings/${id}/edit`} />}
          nativeButton={false}
          aria-label={`Edit ${title}`}
        >
          <PencilIcon />
        </Button>
      )}
      {status === "published" && (
        <Button variant="ghost" size="icon-lg" onClick={() => setDialog("archive")} aria-label={`Archive ${title}`}>
          <ArchiveIcon />
        </Button>
      )}
      {deletable && (
        <Button variant="ghost" size="icon-lg" onClick={() => setDialog("delete")} aria-label={`Delete ${title}`}>
          <Trash2Icon />
        </Button>
      )}

      <ConfirmDialog
        open={dialog === "archive"}
        onOpenChange={(open) => setDialog(open ? "archive" : null)}
        title="Archive this listing?"
        description={`"${title}" will be removed from the store. Archived listings are kept for your records.`}
        confirmLabel="Archive"
        pendingLabel="Archiving…"
        onConfirm={() => run(archiveListing, "Listing archived.")}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
        title="Delete this listing?"
        description={`"${title}" and its image will be deleted. This can't be undone.`}
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        onConfirm={() => run(deleteListing, "Listing deleted.")}
      />
    </div>
  );
}
