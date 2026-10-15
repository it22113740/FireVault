"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightIcon, MailCheckIcon, StoreIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Turnstile, turnstileEnabled } from "@/components/turnstile";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { signup } from "@/lib/actions/auth";
import { showActionError } from "@/lib/forms";
import { safeNextPath, signupSchema, type SignupInput } from "@/lib/validations/auth";

export function SignupForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [pending, startTransition] = useTransition();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: "onTouched",
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await signup(values, token);
      if (!result.ok) {
        showActionError(result, form.setError);
        // Turnstile tokens are single-use
        setToken(null);
        setTurnstileKey((key) => key + 1);
        return;
      }
      if (result.data.needsConfirmation) setSentTo(values.email);
      else router.replace(safeNextPath(next));
    })
  );

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <MailCheckIcon className="size-10 text-primary" />
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to <span className="font-medium text-foreground">{sentTo}</span>.
          Open it to finish creating your account, then log in.
        </p>
        <Link href="/login" className="text-sm text-primary hover:underline">
          Go to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <FormField label="Name" htmlFor="fullName" error={errors.fullName?.message}>
        <Input
          id="fullName"
          autoComplete="name"
          className="h-11"
          aria-invalid={!!errors.fullName}
          {...form.register("fullName")}
        />
      </FormField>
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
      <FormField label="Password" htmlFor="password" hint="At least 8 characters." error={errors.password?.message}>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          className="h-11"
          aria-invalid={!!errors.password}
          {...form.register("password")}
        />
      </FormField>
      <FormField label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          className="h-11"
          aria-invalid={!!errors.confirmPassword}
          {...form.register("confirmPassword")}
        />
      </FormField>
      <Turnstile key={turnstileKey} onToken={setToken} />
      <SubmitButton
        size="lg"
        className="h-11"
        pending={pending}
        pendingLabel="Creating account…"
        disabled={turnstileEnabled && !token}
      >
        Create account
      </SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-medium text-primary hover:underline"
        >
          Log in
        </Link>
      </p>
      <div className="mt-2 border-t border-border/70 pt-5">
        <Link
          href="/apply"
          className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4 transition-colors hover:border-primary hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <StoreIcon className="size-6 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted-foreground">Selling accounts?</span>
            <span className="block text-base font-bold text-primary">Apply to become a seller</span>
          </span>
          <ArrowRightIcon className="size-5 shrink-0 text-primary" aria-hidden="true" />
        </Link>
      </div>
    </form>
  );
}
