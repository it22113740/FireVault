"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CircleCheckBigIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { formatPrice } from "@/src/lib/listings";
import { PAYMENT_METHODS, type PaymentMethod } from "@/src/lib/payment-methods";
import { placeOrder } from "./actions";
import { SlipUpload } from "./slip-upload";

export function CheckoutForm({ listingId, price }: { listingId: string; price: number }) {
  const [state, formAction, pending] = useActionState(placeOrder, undefined);
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [slipPath, setSlipPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const reduce = useReducedMotion();
  const errors = state?.fieldErrors ?? {};

  if (state?.orderId) return <OrderPlaced orderId={state.orderId} />;

  // Submit manually so React doesn't reset the fields when validation fails
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="slipPath" value={slipPath ?? ""} />

      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Step number={1} title="Your details">
        <Field label="Full name" htmlFor="buyerName" error={errors.buyerName}>
          <Input
            id="buyerName"
            name="buyerName"
            autoComplete="name"
            maxLength={100}
            required
            aria-invalid={!!errors.buyerName}
          />
        </Field>
        <Field
          label="Phone number"
          htmlFor="buyerPhone"
          hint="We'll contact you on this number to deliver your account"
          error={errors.buyerPhone}
        >
          <Input
            id="buyerPhone"
            name="buyerPhone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="07X XXX XXXX"
            required
            aria-invalid={!!errors.buyerPhone}
          />
        </Field>
        <Field label="Email (optional)" htmlFor="buyerEmail" error={errors.buyerEmail}>
          <Input
            id="buyerEmail"
            name="buyerEmail"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.buyerEmail}
          />
        </Field>
      </Step>

      <Step number={2} title="Make the payment">
        <Field label="Payment method" htmlFor="paymentMethod" error={errors.paymentMethod}>
          <NativeSelect
            id="paymentMethod"
            name="paymentMethod"
            value={method}
            onChange={(event) => setMethod(event.target.value as PaymentMethod)}
            required
            className="w-full"
            aria-invalid={!!errors.paymentMethod}
          >
            <NativeSelectOption value="" disabled>
              Choose a payment method
            </NativeSelectOption>
            {Object.entries(PAYMENT_METHODS).map(([id, { label }]) => (
              <NativeSelectOption key={id} value={id}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <AnimatePresence initial={false} mode="wait">
          {method && (
            <motion.div
              key={method}
              initial={reduce ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="border border-primary/40 bg-primary/5 p-4">
                <p className="mb-3 text-sm">
                  Send exactly{" "}
                  <span className="font-bold text-primary tabular-nums">{formatPrice(price)}</span>{" "}
                  to:
                </p>
                <dl className="flex flex-col gap-2 text-sm">
                  {PAYMENT_METHODS[method].details.map((detail) => (
                    <div key={detail.label} className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{detail.label}</dt>
                      <dd className="flex items-center gap-1 text-right font-medium">
                        {detail.value}
                        {"copy" in detail && (
                          <CopyButton value={detail.value} label={`Copy ${detail.label}`} />
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Step>

      <Step number={3} title="Upload your payment slip">
        <SlipUpload
          onUploaded={setSlipPath}
          onUploadingChange={setUploading}
          invalid={!!errors.slipPath}
        />
        {errors.slipPath && <p className="text-sm text-destructive">{errors.slipPath[0]}</p>}
      </Step>

      <Button type="submit" size="lg" disabled={pending || uploading}>
        {pending ? "Placing order…" : "Place order"}
      </Button>
    </form>
  );
}

function OrderPlaced({ orderId }: { orderId: string }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="flex flex-col items-center gap-4 border bg-card p-6 text-center"
    >
      <CircleCheckBigIcon className="size-12 text-primary" />
      <div>
        <h2 className="text-xl font-bold">Order placed!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll verify your payment and send the account login details to you.
          Keep your order ID in case you need to contact us.
        </p>
      </div>
      <div className="flex w-full max-w-md items-center gap-1 rounded-lg border bg-background py-1 pr-1 pl-3">
        <code className="flex-1 truncate text-left font-mono text-sm">{orderId}</code>
        <CopyButton value={orderId} label="Copy order ID" />
      </div>
      <Button render={<Link href="/" />} nativeButton={false} variant="outline">
        Back to store
      </Button>
    </motion.div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-4 flex items-center gap-2 font-semibold">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {number}
        </span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive">{error[0]}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
