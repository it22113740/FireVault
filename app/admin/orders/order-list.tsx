"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckIcon, CopyIcon, Loader2Icon, MessageCircleIcon, ReceiptIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { setTopupOrderClosed } from "@/lib/actions/topup-orders";
import type { Enums } from "@/lib/database.types";
import { formatDate, formatPrice, shortId } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payments";
import { cn } from "@/lib/utils";
import { whatsappUrl } from "@/lib/whatsapp";

export type OrderRow = {
  id: string;
  topup_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  currency: string;
  player_uid: string;
  whatsapp_number: string;
  payment_method: Enums<"topup_payment_method">;
  status: Enums<"topup_order_status">;
  created_at: string;
  closed_at: string | null;
  customerName: string;
  customerEmail: string | null;
  receiptUrl: string | null;
};

const EMPTY: Record<Enums<"topup_order_status">, string> = {
  open: "No open orders. New top-up orders appear here.",
  closed: "No closed orders yet.",
};

export function OrderList({
  orders,
  status,
  focusId,
}: {
  orders: OrderRow[];
  status: Enums<"topup_order_status"> | "all";
  focusId: string | null;
}) {
  const reduce = useReducedMotion();
  if (orders.length === 0) return <EmptyState icon={ReceiptIcon} title={status === "all" ? "No top-up orders yet." : EMPTY[status]} />;

  // Closed/reopened cards slide out when the refreshed list drops them
  return (
    <ul className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {orders.map((order) => (
          <motion.li
            key={order.id}
            layout={!reduce}
            exit={{ opacity: 0, x: reduce ? 0 : 40 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <OrderCard order={order} focused={order.id === focusId} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function OrderCard({ order, focused }: { order: OrderRow; focused: boolean }) {
  const [zoom, setZoom] = useState(false);
  const doneMessage = `Hi ${order.customerName}, your FireVault top-up order ${shortId(order.id)} (${order.topup_name} × ${order.quantity}) for player UID ${order.player_uid} is complete. Thank you!`;

  return (
    <article
      className={cn(
        "grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-[8rem_1fr]",
        focused && "border-primary/60 ring-2 ring-primary/20"
      )}
    >
      {order.receiptUrl ? (
        <button
          type="button"
          onClick={() => setZoom(true)}
          className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border bg-muted sm:w-32"
          aria-label={`View proof of payment for order ${shortId(order.id)}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
          <img src={order.receiptUrl} alt="" className="size-full object-cover" />
        </button>
      ) : (
        <div className="flex aspect-[3/4] items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground sm:w-32">
          No proof of payment
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-semibold break-words">
              {order.topup_name} × {order.quantity}
            </h2>
            <p className="text-xs text-muted-foreground">
              Order <span className="font-mono">{shortId(order.id)}</span> · {formatDate(order.created_at)}
              {order.closed_at && ` · closed ${formatDate(order.closed_at)}`}
            </p>
          </div>
          <p className="font-heading text-xl font-bold text-primary tabular-nums">
            {formatPrice(order.total, order.currency)}
          </p>
        </div>

        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Detail label="Player UID">
            <span className="flex items-center gap-1">
              <span className="font-mono font-medium tabular-nums">{order.player_uid}</span>
              <CopyButton value={order.player_uid} label="player UID" />
            </span>
          </Detail>
          <Detail label="Price">
            {formatPrice(order.unit_price, order.currency)} × {order.quantity}
          </Detail>
          <Detail label="Paid by">{paymentMethodLabel(order.payment_method)}</Detail>
          <Detail label="Customer">
            {order.customerName}
            {order.customerEmail && (
              <a href={`mailto:${order.customerEmail}`} className="block truncate text-muted-foreground hover:text-primary">
                {order.customerEmail}
              </a>
            )}
          </Detail>
          <Detail label="Customer WhatsApp">
            <a
              href={whatsappUrl(order.whatsapp_number)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary"
            >
              {order.whatsapp_number}
            </a>
          </Detail>
        </dl>

        <div className="flex flex-wrap gap-2">
          {order.status === "open" ? <CloseButton order={order} /> : <ReopenButton order={order} />}
          <Button
            size="lg"
            variant="outline"
            className="h-11"
            nativeButton={false}
            render={
              <a
                href={whatsappUrl(order.whatsapp_number, order.status === "open" ? doneMessage : undefined)}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <MessageCircleIcon /> Message customer
          </Button>
        </div>
      </div>

      {order.receiptUrl && (
        <Dialog open={zoom} onOpenChange={setZoom}>
          <DialogContent className="max-w-2xl p-2 sm:max-w-2xl">
            <DialogTitle className="sr-only">Proof of payment for order {shortId(order.id)}</DialogTitle>
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
            <img
              src={order.receiptUrl}
              alt={`Proof of payment for order ${shortId(order.id)}`}
              className="max-h-[85svh] w-full rounded-lg object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </article>
  );
}

function CloseButton({ order }: { order: OrderRow }) {
  const [open, setOpen] = useState(false);

  async function close() {
    const result = await setTopupOrderClosed(order.id, true);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success(`Order ${shortId(order.id)} closed.`);
    return true;
  }

  return (
    <>
      <Button size="lg" className="h-11" onClick={() => setOpen(true)}>
        <CheckIcon /> Mark as closed
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Close order ${shortId(order.id)}?`}
        description={`Close it once ${order.topup_name} × ${order.quantity} is delivered to UID ${order.player_uid}. You can reopen it from the Closed tab.`}
        confirmLabel="Mark as closed"
        pendingLabel="Closing…"
        destructive={false}
        onConfirm={close}
      />
    </>
  );
}

function ReopenButton({ order }: { order: OrderRow }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="lg"
      variant="outline"
      className="h-11"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await setTopupOrderClosed(order.id, false);
          if (!result.ok) return void toast.error(result.error);
          toast.success(`Order ${shortId(order.id)} reopened.`);
        })
      }
    >
      {pending ? <Loader2Icon className="animate-spin" /> : <RotateCcwIcon />} Reopen
    </Button>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Select it and copy it manually.");
    }
  }
  return (
    <Button type="button" variant="ghost" size="icon-sm" onClick={copy} aria-label={`Copy ${label}`}>
      {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
    </Button>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
