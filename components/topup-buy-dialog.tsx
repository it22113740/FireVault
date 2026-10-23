"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  CheckCircle2Icon,
  CheckIcon,
  CopyIcon,
  LandmarkIcon,
  MessageCircleIcon,
  MinusIcon,
  PlusIcon,
  ShoppingCartIcon,
  SmartphoneIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
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
import {
  EZCASH_LANGUAGES,
  PAYMENT_METHODS,
  availablePaymentMethods,
  type BankAccount,
  type EzCashLanguage,
  type PaymentMethod,
  type PaymentOptions,
} from "@/lib/payments";
import { shrinkImage } from "@/lib/shrink-image";
import { cn } from "@/lib/utils";
import {
  MAX_ORDER_QUANTITY,
  topupOrderSchema,
  type TopupOrderInput,
  type TopupOrderOutput,
} from "@/lib/validations/topup-order";

type TopupBuyDialogProps = {
  topup: { id: string; name: string; price: number };
  currency: string;
  /** What the super admin set up in Settings; possibly nothing yet */
  payments: PaymentOptions;
  /** Pre-fills the WhatsApp field from the customer's profile */
  defaultWhatsapp: string;
};

type PlacedOrder = { id: string; whatsappUrl: string };

const METHOD_ICONS: Record<PaymentMethod, LucideIcon> = {
  bank: LandmarkIcon,
  ezcash: SmartphoneIcon,
  binance: WalletIcon,
};

// Payment method and its details first (so the customer can pay), then UID,
// quantity, WhatsApp and the proof of payment. Opens from the top-up card's
// Buy button.
export function TopupBuyDialog({ topup, currency, payments, defaultWhatsapp }: TopupBuyDialogProps) {
  const [open, setOpen] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const methods = availablePaymentMethods(payments);

  return (
    <>
      <Button size="lg" className="mt-2 h-11 w-full" onClick={() => setOpen(true)}>
        <ShoppingCartIcon /> Buy now
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          // Once ordered, the only way out is sending the order on WhatsApp
          // (no close button, Escape or outside click)
          if (!placed) setOpen(next);
        }}
      >
        <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg" showCloseButton={!placed}>
          {placed ? (
            <OrderPlaced
              order={placed}
              onSent={() => {
                setOpen(false);
                // Start fresh next time
                setPlaced(null);
              }}
            />
          ) : (
            <>
              <div className="flex flex-col gap-1 pr-8">
                <DialogTitle className="font-heading text-lg">Buy {topup.name}</DialogTitle>
                <DialogDescription>Pay the total, then send us your details and proof of payment.</DialogDescription>
              </div>
              {methods.length > 0 ? (
                <BuyForm
                  topup={topup}
                  currency={currency}
                  payments={payments}
                  methods={methods}
                  defaultWhatsapp={defaultWhatsapp}
                  onPlaced={setPlaced}
                />
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
  payments,
  methods,
  defaultWhatsapp,
  onPlaced,
}: TopupBuyDialogProps & { methods: PaymentMethod[]; onPlaced: (order: PlacedOrder) => void }) {
  const [pending, startTransition] = useTransition();
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState<string>();

  const form = useForm<TopupOrderInput, unknown, TopupOrderOutput>({
    resolver: zodResolver(topupOrderSchema),
    mode: "onTouched",
    defaultValues: {
      topupId: topup.id,
      playerUid: "",
      quantity: 1,
      whatsappNumber: defaultWhatsapp,
      paymentMethod: methods[0],
    },
  });
  const { errors } = form.formState;
  const [quantity, method] = useWatch({ control: form.control, name: ["quantity", "paymentMethod"] });
  const total = formatPrice(topup.price * quantity, currency);
  const proof = PAYMENT_METHODS.find((option) => option.value === method)!;

  const onSubmit = form.handleSubmit((values) => {
    if (!receipt) return setReceiptError(`Add the ${proof.proof.toLowerCase()}`);

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
      formData.set("paymentMethod", values.paymentMethod);
      formData.set("receipt", file);

      const result = await placeTopupOrder(formData);
      if (!result.ok) {
        setReceiptError(result.fieldErrors?.receipt?.[0]);
        return showActionError(result, form.setError);
      }
      toast.success("Order placed.");
      onPlaced(result.data);
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {methods.length > 1 && (
        <Controller
          control={form.control}
          name="paymentMethod"
          render={({ field }) => <MethodPicker methods={methods} value={field.value} onChange={field.onChange} />}
        />
      )}
      {method === "bank" && <BankPanel accounts={payments.bank} total={total} />}
      {method === "ezcash" && payments.ezcash && <EzCashPanel ezcash={payments.ezcash} total={total} />}
      {method === "binance" && payments.binance && <BinancePanel binance={payments.binance} total={total} />}

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

      <FormField label={proof.proof} htmlFor="receipt" hint={proof.proofHint}>
        <ImagePicker
          id="receipt"
          aspect="4/3"
          label="Add screenshot or photo"
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

// Radio buttons styled as tiles; shown only when more than one method is set up
function MethodPicker({
  methods,
  value,
  onChange,
}: {
  methods: PaymentMethod[];
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">How will you pay?</legend>
      <div className="grid grid-cols-3 gap-2">
        {PAYMENT_METHODS.filter((option) => methods.includes(option.value)).map((option) => {
          const Icon = METHOD_ICONS[option.value];
          return (
            <label
              key={option.value}
              className={cn(
                "flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                value === option.value ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent/50"
              )}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <Icon className="size-5" />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function PaymentPanel({
  icon: Icon,
  title,
  total,
  children,
}: {
  icon: LucideIcon;
  title: string;
  total: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-medium">
          <Icon className="size-4 text-primary" /> {title}
        </h3>
        <span className="font-heading text-lg font-bold text-primary tabular-nums">{total}</span>
      </div>
      {children}
    </section>
  );
}

function BankPanel({ accounts, total }: { accounts: BankAccount[]; total: string }) {
  return (
    <PaymentPanel icon={LandmarkIcon} title="Pay by bank transfer" total={total}>
      {accounts.length > 1 && <p className="text-sm text-muted-foreground">Transfer to any one of these accounts.</p>}
      <ul className="flex flex-col gap-2">
        {accounts.map((account, index) => (
          <li key={index} className={cn(accounts.length > 1 && "rounded-lg border bg-card p-3")}>
            <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Bank</dt>
              <dd className="min-w-0 font-medium break-words">
                {account.bankName} · {account.branch}
              </dd>
              <dt className="text-muted-foreground">Account name</dt>
              <dd className="min-w-0 font-medium break-words">{account.accountName}</dd>
              <dt className="text-muted-foreground">Account number</dt>
              <dd className="flex min-w-0 items-center gap-2">
                <span className="font-medium tabular-nums break-all">{account.accountNumber}</span>
                <CopyButton value={account.accountNumber.replace(/[\s-]/g, "")} label="account number" />
              </dd>
            </dl>
          </li>
        ))}
      </ul>
    </PaymentPanel>
  );
}

// The super admin writes the instructions in English, Sinhala and Tamil
function EzCashPanel({ ezcash, total }: { ezcash: NonNullable<PaymentOptions["ezcash"]>; total: string }) {
  const [language, setLanguage] = useState<EzCashLanguage>(EZCASH_LANGUAGES[0].value);
  return (
    <PaymentPanel icon={SmartphoneIcon} title="Pay by eZ Cash" total={total}>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 text-sm">
        <dt className="text-muted-foreground">eZ Cash number</dt>
        <dd className="flex min-w-0 items-center gap-2">
          <span className="font-medium tabular-nums">{ezcash.number}</span>
          <CopyButton value={ezcash.number} label="eZ Cash number" />
        </dd>
      </dl>
      <div className="flex flex-col gap-2">
        <div role="group" aria-label="Message language" className="flex gap-1 rounded-lg bg-muted p-1">
          {EZCASH_LANGUAGES.map((option) => (
            <button
              key={option.value}
              type="button"
              lang={option.value}
              aria-pressed={language === option.value}
              onClick={() => setLanguage(option.value)}
              className={cn(
                "min-h-9 flex-1 rounded-md px-2 text-sm font-medium transition-colors",
                language === option.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p lang={language} className="text-sm whitespace-pre-line break-words">
          {ezcash.messages[language]}
        </p>
      </div>
    </PaymentPanel>
  );
}

function BinancePanel({ binance, total }: { binance: NonNullable<PaymentOptions["binance"]>; total: string }) {
  return (
    <PaymentPanel icon={WalletIcon} title="Pay by Binance" total={total}>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Binance Pay ID</dt>
        <dd className="flex min-w-0 items-center gap-2">
          <span className="font-medium tabular-nums break-all">{binance.payId}</span>
          <CopyButton value={binance.payId} label="Binance Pay ID" />
        </dd>
        <dt className="text-muted-foreground">Name</dt>
        <dd className="min-w-0 font-medium break-words">{binance.name}</dd>
      </dl>
    </PaymentPanel>
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

// Required last step: the WhatsApp message carries the order details and a
// link to the proof of payment, and we work from that chat. Sending it is the
// only way to close the dialog.
function OrderPlaced({ order, onSent }: { order: PlacedOrder; onSent: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <CheckCircle2Icon className="size-12 text-success" />
      <DialogTitle className="font-heading text-xl">One last step</DialogTitle>
      <DialogDescription>
        Order <span className="font-mono font-medium text-foreground">{shortId(order.id)}</span> is saved. Send it to
        us on WhatsApp to complete your order: we only start once we receive your message.
      </DialogDescription>
      <Button
        size="lg"
        className="mt-2 h-12 w-full text-base"
        nativeButton={false}
        render={<a href={order.whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={onSent} />}
      >
        <MessageCircleIcon /> Send order on WhatsApp
      </Button>
    </div>
  );
}
