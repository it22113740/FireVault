"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateSettings } from "@/lib/actions/settings";
import { showActionError } from "@/lib/forms";
import {
  settingsSchema,
  type SettingsInput,
  type SettingsOutput,
} from "@/lib/validations/settings";

export function SettingsForm({ defaults }: { defaults: SettingsInput }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<SettingsInput, unknown, SettingsOutput>({
    resolver: zodResolver(settingsSchema),
    mode: "onChange",
    defaultValues: defaults,
  });
  const { errors } = form.formState;
  const inactiveMessage = useWatch({ control: form.control, name: "inactiveMessage" });

  // Validated client-side; the server re-parses the raw input
  const onSubmit = form.handleSubmit(() =>
    startTransition(async () => {
      const values = form.getValues();
      const result = await updateSettings(values);
      if (!result.ok) return showActionError(result, form.setError);
      form.reset(values);
      toast.success("Settings saved.");
    })
  );

  return (
    <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-5" noValidate>
      <FormField
        label="Admin WhatsApp number"
        htmlFor="adminWhatsapp"
        hint="Buyers of top-ups and your own listings, and inactive sellers, message this number."
        error={errors.adminWhatsapp?.message}
      >
        <Input
          id="adminWhatsapp"
          type="tel"
          inputMode="tel"
          placeholder="077 123 4567"
          className="h-11"
          aria-invalid={!!errors.adminWhatsapp}
          {...form.register("adminWhatsapp")}
        />
      </FormField>
      <FormField label="Currency" htmlFor="currency" hint="3-letter code shown before prices." error={errors.currency?.message}>
        <Input
          id="currency"
          maxLength={3}
          className="h-11 w-28 uppercase"
          aria-invalid={!!errors.currency}
          {...form.register("currency")}
        />
      </FormField>
      <FormField
        label="Regions"
        htmlFor="regions"
        hint="Comma-separated codes offered in the listing form and filters."
        error={errors.regions?.message}
      >
        <Input id="regions" className="h-11" aria-invalid={!!errors.regions} {...form.register("regions")} />
      </FormField>
      <FormField
        label="Inactive seller message"
        htmlFor="inactiveMessage"
        error={errors.inactiveMessage?.message}
        counter={{ value: inactiveMessage.length, max: 500 }}
      >
        <Textarea
          id="inactiveMessage"
          rows={4}
          aria-invalid={!!errors.inactiveMessage}
          {...form.register("inactiveMessage")}
        />
      </FormField>
      <SubmitButton size="lg" className="h-11 w-fit" pending={pending} pendingLabel="Saving…">
        Save settings
      </SubmitButton>
    </form>
  );
}
