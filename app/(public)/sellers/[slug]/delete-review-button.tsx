"use client";

import { useState } from "react";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { deleteFeedback } from "@/lib/actions/feedback";

// Super admin moderation of a single review
export function DeleteReviewButton({ id, reviewer }: { id: string; reviewer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon-lg"
        onClick={() => setOpen(true)}
        aria-label={`Delete ${reviewer}'s review`}
      >
        <Trash2Icon />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this review?"
        description={`${reviewer}'s like/dislike, rating and comment will be removed. This can't be undone.`}
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        onConfirm={async () => {
          const result = await deleteFeedback(id);
          if (result.ok) toast.success("Review deleted.");
          else toast.error(result.error);
          return result.ok;
        }}
      />
    </>
  );
}
