"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckIcon, ClipboardCheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Textarea } from "@/components/ui/textarea";
import { approveListing, rejectListing } from "@/lib/actions/listings";
import { formatDate, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LISTING_LIMITS } from "@/lib/validations/listing";

export type ReviewItem = {
  id: string;
  title: string;
  description: string;
  price: number;
  region: string;
  imageUrl: string;
  submittedAt: string | null;
  sellerName: string;
};

export function ReviewQueue({ items, currency }: { items: ReviewItem[]; currency: string }) {
  const reduce = useReducedMotion();
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  const [approving, startApprove] = useTransition();
  const [rejecting, setRejecting] = useState<ReviewItem | null>(null);
  const [reason, setReason] = useState("");

  // Keep a valid selection as approved/rejected items leave the list
  const active = items.find((item) => item.id === activeId) ?? items[0] ?? null;

  const approve = useCallback(
    (item: ReviewItem) =>
      startApprove(async () => {
        const result = await approveListing(item.id);
        if (result.ok) toast.success(`"${item.title}" is live.`);
        else toast.error(result.error);
      }),
    []
  );

  // A approve · R reject · J/K next/previous (ignored while typing or in a dialog)
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (rejecting || event.metaKey || event.ctrlKey || event.altKey) return;
      if (target.closest("input, textarea, select, [contenteditable=true]")) return;
      if (!active) return;

      const index = items.findIndex((item) => item.id === active.id);
      const key = event.key.toLowerCase();
      if (key === "j" || key === "k") {
        const next = items[index + (key === "j" ? 1 : -1)];
        if (next) {
          setActiveId(next.id);
          document.getElementById(`review-${next.id}`)?.scrollIntoView({ block: "nearest" });
        }
      } else if (key === "a" && !approving) {
        approve(active);
      } else if (key === "r") {
        setReason("");
        setRejecting(active);
      } else {
        return;
      }
      event.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, active, approving, rejecting, approve]);

  async function reject() {
    if (!rejecting) return false;
    const result = await rejectListing(rejecting.id, reason);
    if (!result.ok) {
      toast.error(result.fieldErrors?.reason?.[0] ?? result.error);
      return false;
    }
    toast.success(`Sent "${rejecting.title}" back to the seller.`);
    return true;
  }

  if (items.length === 0) {
    return <EmptyState icon={ClipboardCheckIcon} title="Nothing to review. You're all caught up." />;
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const selected = item.id === active?.id;
            return (
              <motion.li
                key={item.id}
                id={`review-${item.id}`}
                layout={!reduce}
                exit={{ opacity: 0, x: reduce ? 0 : 40 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={() => setActiveId(item.id)}
                className={cn(
                  "grid gap-4 rounded-xl border bg-card p-4 transition-colors sm:grid-cols-[12rem_1fr]",
                  selected && "border-primary/60 ring-1 ring-primary/30"
                )}
              >
                <div className="relative aspect-[35/52] overflow-hidden rounded-lg bg-muted">
                  {item.imageUrl && (
                    <Image src={item.imageUrl} alt={item.title} fill sizes="192px" className="object-contain" />
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-3">
                  <div>
                    <h2 className="font-heading text-lg font-semibold">{item.title}</h2>
                    <p className="text-xs text-muted-foreground">
                      {item.sellerName}
                      {item.submittedAt && ` · submitted ${formatDate(item.submittedAt)}`}
                    </p>
                  </div>
                  <p className="line-clamp-4 text-sm whitespace-pre-line text-muted-foreground">
                    {item.description}
                  </p>
                  <p className="text-sm">
                    <span className="font-heading text-lg font-bold text-primary tabular-nums">
                      {formatPrice(item.price, currency)}
                    </span>
                    <span className="text-muted-foreground"> · {item.region}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="lg"
                      className="h-11"
                      disabled={approving}
                      onClick={(event) => {
                        event.stopPropagation();
                        approve(item);
                      }}
                    >
                      {approving && selected ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
                      {approving && selected ? "Approving…" : "Approve"}
                      {selected && <Kbd className="ml-1 hidden sm:inline-flex">A</Kbd>}
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-11"
                      onClick={(event) => {
                        event.stopPropagation();
                        setReason("");
                        setRejecting(item);
                      }}
                    >
                      <XIcon /> Reject
                      {selected && <Kbd className="ml-1 hidden sm:inline-flex">R</Kbd>}
                    </Button>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <ConfirmDialog
        open={rejecting !== null}
        onOpenChange={(open) => !open && setRejecting(null)}
        title={`Reject "${rejecting?.title ?? ""}"?`}
        description="The seller sees this reason at the top of their edit form and can resubmit."
        confirmLabel="Reject listing"
        pendingLabel="Rejecting…"
        onConfirm={reject}
      >
        <FormField
          label="Reason"
          htmlFor="reject-reason"
          counter={{ value: reason.length, max: LISTING_LIMITS.reason }}
        >
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={LISTING_LIMITS.reason}
            rows={3}
            placeholder="e.g. The screenshot doesn't show the account level."
            autoFocus
          />
        </FormField>
      </ConfirmDialog>
    </>
  );
}
