"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { setNewPassword } from "@/lib/actions/auth";
import { showActionError } from "@/lib/forms";
import { newPasswordSchema, type NewPasswordInput } from "@/lib/validations/auth";

export function ResetPasswordForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<NewPasswordInput>({
    resolver: zodResolver(newPasswordSchema),
    mode: "onTouched",
    defaultValues: { password: "", confirmPassword: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await setNewPassword(values);
      if (!result.ok) return showActionError(result, form.setError);
      toast.success("Password saved. Welcome!");
      router.replace("/admin");
    })
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <FormField label="New password" htmlFor="password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          className="h-11"
          aria-invalid={!!errors.password}
          {...form.register("password")}
        />
      </FormField>
      <FormField
        label="Confirm password"
        htmlFor="confirmPassword"
        error={errors.confirmPassword?.message}
      >
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="h-11"
          aria-invalid={!!errors.confirmPassword}
          {...form.register("confirmPassword")}
        />
      </FormField>
      <SubmitButton size="lg" className="h-11" pending={pending} pendingLabel="Saving…">
        Save password
      </SubmitButton>
    </form>
  );
}
