"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/actions/auth";
import { showActionError } from "@/lib/forms";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? undefined;
  const notice = searchParams.has("blocked")
    ? "This account has been blocked. Please contact us if you think this is a mistake."
    : searchParams.has("expired")
      ? "That link has expired or was already used. Log in, or sign up again."
      : null;

  const [pending, startTransition] = useTransition();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      // Redirects on success; only failures come back
      const result = await login(values, next);
      if (result && !result.ok) showActionError(result, form.setError);
    })
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {notice && (
        <Alert variant="destructive">
          <AlertDescription>{notice}</AlertDescription>
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
      <FormField label="Password" htmlFor="password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          className="h-11"
          aria-invalid={!!errors.password}
          {...form.register("password")}
        />
      </FormField>
      <Link
        href="/forgot-password"
        className="-mt-1 w-fit text-sm text-muted-foreground hover:text-foreground"
      >
        Forgot password?
      </Link>
      <SubmitButton size="lg" className="h-11" pending={pending} pendingLabel="Logging in…">
        Log in
      </SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
          className="font-medium text-primary hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
