"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheckIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/actions/auth";
import { showActionError } from "@/lib/forms";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";

export function ForgotPasswordForm() {
  const expired = useSearchParams().has("expired");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onTouched",
    defaultValues: { email: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await requestPasswordReset(values);
      if (result.ok) setSent(true);
      else showActionError(result, form.setError);
    })
  );

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <MailCheckIcon className="size-10 text-primary" />
        <p className="text-sm text-muted-foreground">
          If an account exists for that email, a reset link is on its way. Check your inbox
          and spam folder.
        </p>
        <Link href="/login" className="text-sm text-primary hover:underline">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {expired && (
        <Alert variant="destructive">
          <AlertDescription>That link has expired or was already used. Request a new one.</AlertDescription>
        </Alert>
      )}
      <FormField label="Email" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          className="h-11"
          aria-invalid={!!errors.email}
          {...form.register("email")}
        />
      </FormField>
      <SubmitButton size="lg" className="h-11" pending={pending} pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
      <Link href="/login" className="text-center text-sm text-muted-foreground hover:text-foreground">
        Back to log in
      </Link>
    </form>
  );
}
