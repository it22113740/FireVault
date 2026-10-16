"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { CheckCircle2Icon, CheckIcon, CopyIcon, LandmarkIcon, MinusIcon, PlusIcon, ShoppingCartIcon } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { ImagePicker } from "@/components/image-picker";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { placeTopupOrder } from "@/lib/actions/topup-orders";
import { formatPrice, shortId } from "@/lib/format";
import { showActionError } from "@/lib/forms";
import { shrinkImage } from "@/lib/shrink-image";
import {
  MAX_ORDER_QUANTITY,
  topupOrderSchema,
  type TopupOrderInput,
  type TopupOrderOutput,
} from "@/lib/validations/topup-order";

export type BankDetails = { accountName: string; accountNumber: string; bankName: string; branch: string };

type TopupBuyDialogProps = {
  topup: { id: string; name: string; price: number };
  currency: string;
  /** null when the super admin hasn't set a bank account yet */
  bank: BankDetails | null;
  /** Pre-fills the WhatsApp field from the customer's profile */
  defaultWhatsapp: string;
};

// Bank details first (so the customer can pay), then UID, quantity, WhatsApp
// and the receipt. Opens from the top-up card's Buy button.
export function TopupBuyDialog({ topup, currency, bank, defaultWhatsapp }: TopupBuyDialogProps) {
  const [open, setOpen] = useState(false);
  const [placedId, setPlacedId] = useState<string | null>(null);

  return (
    <>
      <Button size="lg" className="mt-2 h-11 w-full" onClick={() => setOpen(true)}>
        <ShoppingCartIcon /> Buy now
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          // Start fresh next time once an order went through
          if (!next && placedId) setPlacedId(null);
        }}
      >
        <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
          {placedId ? (
            <OrderPlaced id={placedId} onClose={() => setOpen(false)} />
          ) : (
            <>
              <div className="flex flex-col gap-1 pr-8">
                <DialogTitle className="font-heading text-lg">Buy {topup.name}</DialogTitle>
                <DialogDescription>
                  Transfer the total to the account below, then send us your details and the receipt.
                </DialogDescription>
              </div>
              {bank ? (
                <BuyForm topup={topup} currency={currency} bank={bank} defaultWhatsapp={defaultWhatsapp} onPlaced={setPlacedId} />
              ) : (
                <p className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
                  Online payments aren&apos;t set up yet. Please message us on WhatsApp to order this top-up.
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function BuyForm({
  topup,
  currency,
  bank,
  defaultWhatsapp,
  onPlaced,
}: Omit<TopupBuyDialogProps, "bank"> & { bank: BankDetails; onPlaced: (id: string) => void }) {
  const [pending, startTransition] = useTransition();
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState<string>();

  const form = useForm<TopupOrderInput, unknown, TopupOrderOutput>({
    resolver: zodResolver(topupOrderSchema),
    mode: "onTouched",
    defaultValues: { topupId: topup.id, playerUid: "", quantity: 1, whatsappNumber: defaultWhatsapp },
  });
  const { errors } = form.formState;
  const quantity = useWatch({ control: form.control, name: "quantity" });
  const total = formatPrice(topup.price * quantity, currency);

  const onSubmit = form.handleSubmit((values) => {
    if (!receipt) return setReceiptError("Add a photo or screenshot of your payment receipt");

    startTransition(async () => {
      let file: File;
      try {
        file = await shrinkImage(receipt);
      } catch (error) {
        return setReceiptError((error as Error).message);
      }

      const formData = new FormData();
      formData.set("topupId", values.topupId);
      formData.set("playerUid", values.playerUid);
      formData.set("quantity", String(values.quantity));
      formData.set("whatsappNumber", values.whatsappNumber);
      formData.set("receipt", file);

      const result = await placeTopupOrder(formData);
      if (!result.ok) {
        setReceiptError(result.fieldErrors?.receipt?.[0]);
        return showActionError(result, form.setError);
      }
      toast.success("Order placed.");
      onPlaced(result.data.id);
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <BankPanel bank={bank} total={total} />

      <FormField
        label="Player UID"
        htmlFor="playerUid"
        hint="Find it on your in-game profile. Double-check it: we top up this UID."
        error={errors.playerUid?.message}
      >
        <Input
          id="playerUid"
          inputMode="numeric"
          autoComplete="off"
          placeholder="e.g. 1234567890"
          className="h-11 tabular-nums"
          aria-invalid={!!errors.playerUid}
          {...form.register("playerUid")}
        />
      </FormField>

      <Controller
        control={form.control}
        name="quantity"
        render={({ field }) => (
          <FormField label="Quantity" htmlFor="quantity" hint={`Up to ${MAX_ORDER_QUANTITY} per order.`} error={errors.quantity?.message}>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                className="size-11"
                onClick={() => field.onChange(Math.max(1, field.value - 1))}
                disabled={field.value <= 1}
                aria-label="Decrease quantity"
              >
                <MinusIcon />
              </Button>
              <output
                id="quantity"
                aria-live="polite"
                className="w-10 text-center font-heading text-2xl font-bold tabular-nums"
              >
                {field.value}
              </output>
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                className="size-11"
                onClick={() => field.onChange(Math.min(MAX_ORDER_QUANTITY, field.value + 1))}
                disabled={field.value >= MAX_ORDER_QUANTITY}
                aria-label="Increase quantity"
              >
                <PlusIcon />
              </Button>
              <span className="ml-auto text-right text-sm text-muted-foreground">
                {formatPrice(topup.price, currency)} each
              </span>
            </div>
          </FormField>
        )}
      />

      <FormField
        label="Your WhatsApp number"
        htmlFor="whatsappNumber"
        hint="We'll message you here once your top-up is done."
        error={errors.whatsappNumber?.message}
      >
        <Input
          id="whatsappNumber"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="077 123 4567"
          className="h-11"
          aria-invalid={!!errors.whatsappNumber}
          {...form.register("whatsappNumber")}
        />
      </FormField>

      <FormField label="Payment receipt" htmlFor="receipt" hint="A photo or screenshot of the bank transfer.">
        <ImagePicker
          id="receipt"
          aspect="4/3"
          label="Add receipt"
          maxMb={20}
          file={receipt}
          onFileChange={(file) => {
            setReceipt(file);
            setReceiptError(undefined);
          }}
          error={receiptError}
        />
      </FormField>

      <SubmitButton size="lg" className="h-12 w-full text-base" pending={pending} pendingLabel="Placing order…">
        Submit order · {total}
      </SubmitButton>
    </form>
  );
}

function BankPanel({ bank, total }: { bank: BankDetails; total: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-medium">
          <LandmarkIcon className="size-4 text-primary" /> Pay by bank transfer
        </h3>
        <span className="font-heading text-lg font-bold text-primary tabular-nums">{total}</span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Account name</dt>
        <dd className="min-w-0 font-medium break-words">{bank.accountName}</dd>
        <dt className="text-muted-foreground">Account number</dt>
        <dd className="flex min-w-0 items-center gap-2">
          <span className="font-medium tabular-nums break-all">{bank.accountNumber}</span>
          <CopyButton value={bank.accountNumber.replace(/[\s-]/g, "")} label="account number" />
        </dd>
        <dt className="text-muted-foreground">Bank</dt>
        <dd className="min-w-0 font-medium break-words">{bank.bankName}</dd>
        <dt className="text-muted-foreground">Branch</dt>
        <dd className="min-w-0 font-medium break-words">{bank.branch}</dd>
      </dl>
    </section>
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
      toast.error("Couldn't copy. Long-press the number to copy it.");
    }
  }
  return (
    <Button type="button" variant="ghost" size="icon-sm" onClick={copy} aria-label={`Copy ${label}`}>
      {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
    </Button>
  );
}

function OrderPlaced({ id, onClose }: { id: string; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <CheckCircle2Icon className="size-12 text-success" />
      <DialogTitle className="font-heading text-xl">Order placed</DialogTitle>
      <DialogDescription>
        Order <span className="font-mono font-medium text-foreground">{shortId(id)}</span> is with us. We&apos;ll
        check your payment, top up your account and message you on WhatsApp.
      </DialogDescription>
      <Button size="lg" className="mt-2 h-11 w-full" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}
