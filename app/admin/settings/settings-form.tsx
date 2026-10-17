"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
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

type SellerChoice = { id: string; name: string; hasWhatsapp: boolean };

export function SettingsForm({ defaults, sellers }: { defaults: SettingsInput; sellers: SellerChoice[] }) {
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
      <fieldset className="flex flex-col gap-4 rounded-xl border p-4">
        <legend className="px-1 text-sm font-medium">Bank account for top-up payments</legend>
        <p className="-mt-1 text-xs text-muted-foreground">
          Shown first in the top-up Buy window so customers know where to transfer. Leave all four empty
          to turn top-up buying off.
        </p>
        <FormField label="Account name" htmlFor="bankAccountName" error={errors.bankAccountName?.message}>
          <Input
            id="bankAccountName"
            autoComplete="off"
            className="h-11"
            aria-invalid={!!errors.bankAccountName}
            {...form.register("bankAccountName")}
          />
        </FormField>
        <FormField label="Account number" htmlFor="bankAccountNumber" error={errors.bankAccountNumber?.message}>
          <Input
            id="bankAccountNumber"
            inputMode="numeric"
            autoComplete="off"
            className="h-11 tabular-nums"
            aria-invalid={!!errors.bankAccountNumber}
            {...form.register("bankAccountNumber")}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Bank" htmlFor="bankName" error={errors.bankName?.message}>
            <Input
              id="bankName"
              placeholder="e.g. Commercial Bank"
              className="h-11"
              aria-invalid={!!errors.bankName}
              {...form.register("bankName")}
            />
          </FormField>
          <FormField label="Branch" htmlFor="bankBranch" error={errors.bankBranch?.message}>
            <Input
              id="bankBranch"
              placeholder="e.g. Kandy"
              className="h-11"
              aria-invalid={!!errors.bankBranch}
              {...form.register("bankBranch")}
            />
          </FormField>
        </div>
      </fieldset>
      <Controller
        control={form.control}
        name="sellContactSellerIds"
        render={({ field }) => (
          <SellContactSellers
            sellers={sellers}
            value={field.value}
            onChange={field.onChange}
            error={errors.sellContactSellerIds?.message}
          />
        )}
      />
      <SubmitButton size="lg" className="h-11 w-fit" pending={pending} pendingLabel="Saving…">
        Save settings
      </SubmitButton>
    </form>
  );
}

// Homepage "Want to sell account?" window: only these sellers are listed,
// in the order they're ticked
function SellContactSellers({
  sellers,
  value,
  onChange,
  error,
}: {
  sellers: SellerChoice[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border p-4">
      <legend className="px-1 text-sm font-medium">&ldquo;Want to sell account?&rdquo; sellers</legend>
      <p className="-mt-1 text-xs text-muted-foreground">
        Customers who want to sell their account choose one of these sellers on the homepage and chat with them on
        WhatsApp. None ticked hides the button.
      </p>
      {sellers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No seller shops yet.</p>
      ) : (
        <ul className="flex max-h-64 flex-col divide-y overflow-y-auto rounded-lg border bg-card">
          {sellers.map((seller) => {
            const position = value.indexOf(seller.id);
            const checked = position !== -1;
            return (
              <li key={seller.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-accent/50">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={checked}
                    onChange={(event) =>
                      onChange(event.target.checked ? [...value, seller.id] : value.filter((id) => id !== seller.id))
                    }
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {seller.name}
                    {!seller.hasWhatsapp && <span className="text-warning"> (no WhatsApp number)</span>}
                  </span>
                  {checked && value.length > 1 && (
                    <span className="text-xs text-muted-foreground tabular-nums">#{position + 1}</span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </fieldset>
  );
}
