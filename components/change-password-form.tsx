"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { changePassword } from "@/lib/actions/settings";
import { showActionError } from "@/lib/forms";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations/settings";

// Shared by the admin profile page and the customer account page
export function ChangePasswordForm() {
  const [pending, startTransition] = useTransition();
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onTouched",
    defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await changePassword(values);
      if (!result.ok) return showActionError(result, form.setError);
      form.reset();
      toast.success("Password changed.");
    })
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <FormField label="Current password" htmlFor="currentPassword" error={errors.currentPassword?.message}>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          className="h-11"
          aria-invalid={!!errors.currentPassword}
          {...form.register("currentPassword")}
        />
      </FormField>
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
      <FormField label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="h-11"
          aria-invalid={!!errors.confirmPassword}
          {...form.register("confirmPassword")}
        />
      </FormField>
      <SubmitButton size="lg" className="h-11 w-fit" pending={pending} pendingLabel="Changing…">
        Change password
      </SubmitButton>
    </form>
  );
}
