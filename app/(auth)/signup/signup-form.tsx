"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheckIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Turnstile, turnstileEnabled } from "@/components/turnstile";
import { Input } from "@/components/ui/input";
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
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          className="h-11"
          aria-invalid={!!errors.password}
          {...form.register("password")}
        />
      </FormField>
      <FormField label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
        <Input
          id="confirmPassword"
          type="password"
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
      <p className="text-center text-xs text-muted-foreground">
        Selling accounts?{" "}
        <Link href="/apply" className="hover:text-foreground hover:underline">
          Apply to become a seller
        </Link>
      </p>
    </form>
  );
}
