"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { LandmarkIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateSettings } from "@/lib/actions/settings";
import { showActionError } from "@/lib/forms";
import { MAX_BANK_ACCOUNTS } from "@/lib/payments";
import {
  settingsSchema,
  type SettingsInput,
  type SettingsOutput,
} from "@/lib/validations/settings";

type SellerChoice = { id: string; name: string; hasWhatsapp: boolean };
type SettingsFormApi = UseFormReturn<SettingsInput, unknown, SettingsOutput>;

const EZCASH_MESSAGE_FIELDS = [
  { name: "ezcashMessageEn", label: "English", lang: "en" },
  { name: "ezcashMessageSi", label: "සිංහල", lang: "si" },
  { name: "ezcashMessageTa", label: "தமிழ்", lang: "ta" },
] as const;

export function SettingsForm({ defaults, sellers }: { defaults: SettingsInput; sellers: SellerChoice[] }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<SettingsInput, unknown, SettingsOutput>({
    resolver: zodResolver(settingsSchema),
    mode: "onChange",
    defaultValues: defaults,
  });
  const { errors } = form.formState;
  const inactiveMessage = useWatch({ control: form.control, name: "inactiveMessage" });
  const [ezcashMessageEn, ezcashMessageSi, ezcashMessageTa] = useWatch({
    control: form.control,
    name: ["ezcashMessageEn", "ezcashMessageSi", "ezcashMessageTa"],
  });
  const ezcashMessages = { ezcashMessageEn, ezcashMessageSi, ezcashMessageTa };

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
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-lg font-semibold">Top-up payments</h2>
        <p className="text-sm text-muted-foreground">
          Customers choose one of these in the top-up Buy window, pay, then upload proof. Set up at least one;
          with none, the Buy window asks customers to message you on WhatsApp.
        </p>
      </div>
      <BankAccountsFields form={form} />
      <fieldset className="flex flex-col gap-4 rounded-xl border p-4">
        <legend className="px-1 text-sm font-medium">eZ Cash</legend>
        <p className="-mt-1 text-xs text-muted-foreground">
          Customers send money to this number and upload a screenshot of the transfer. The message is shown in the
          language they pick. Leave the number empty to turn eZ Cash off.
        </p>
        <FormField label="eZ Cash mobile number" htmlFor="ezcashNumber" error={errors.ezcashNumber?.message}>
          <Input
            id="ezcashNumber"
            type="tel"
            inputMode="tel"
            placeholder="077 123 4567"
            className="h-11"
            aria-invalid={!!errors.ezcashNumber}
            {...form.register("ezcashNumber")}
          />
        </FormField>
        {EZCASH_MESSAGE_FIELDS.map(({ name, label, lang }) => (
          <FormField
            key={name}
            label={`Message (${label})`}
            htmlFor={name}
            error={errors[name]?.message}
            counter={{ value: ezcashMessages[name]?.length ?? 0, max: 1000 }}
          >
            <Textarea id={name} lang={lang} rows={3} aria-invalid={!!errors[name]} {...form.register(name)} />
          </FormField>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-4 rounded-xl border p-4">
        <legend className="px-1 text-sm font-medium">Binance</legend>
        <p className="-mt-1 text-xs text-muted-foreground">
          Customers pay your Binance Pay ID and upload a screenshot of the successful transfer. Leave both empty to
          turn Binance off.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Binance Pay ID" htmlFor="binancePayId" error={errors.binancePayId?.message}>
            <Input
              id="binancePayId"
              inputMode="numeric"
              autoComplete="off"
              className="h-11 tabular-nums"
              aria-invalid={!!errors.binancePayId}
              {...form.register("binancePayId")}
            />
          </FormField>
          <FormField label="Binance name" htmlFor="binanceName" error={errors.binanceName?.message}>
            <Input
              id="binanceName"
              autoComplete="off"
              className="h-11"
              aria-invalid={!!errors.binanceName}
              {...form.register("binanceName")}
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

// Customers see every account and can pay into any of them
function BankAccountsFields({ form }: { form: SettingsFormApi }) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "bankAccounts" });
  const errors = form.formState.errors.bankAccounts;

  return (
    <fieldset className="flex flex-col gap-4 rounded-xl border p-4">
      <legend className="px-1 text-sm font-medium">Bank accounts</legend>
      <p className="-mt-1 text-xs text-muted-foreground">
        Customers transfer to any of these and upload the bank payment slip. Remove them all to turn bank transfer
        off.
      </p>
      {fields.map((field, index) => {
        const accountErrors = errors?.[index];
        const id = (name: string) => `bankAccounts.${index}.${name}`;
        return (
          <div key={field.id} className="flex flex-col gap-4 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <LandmarkIcon className="size-4 text-primary" /> Account {index + 1}
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                <Trash2Icon /> Remove
              </Button>
            </div>
            <FormField label="Account name" htmlFor={id("accountName")} error={accountErrors?.accountName?.message}>
              <Input
                id={id("accountName")}
                autoComplete="off"
                className="h-11"
                aria-invalid={!!accountErrors?.accountName}
                {...form.register(`bankAccounts.${index}.accountName`)}
              />
            </FormField>
            <FormField label="Account number" htmlFor={id("accountNumber")} error={accountErrors?.accountNumber?.message}>
              <Input
                id={id("accountNumber")}
                inputMode="numeric"
                autoComplete="off"
                className="h-11 tabular-nums"
                aria-invalid={!!accountErrors?.accountNumber}
                {...form.register(`bankAccounts.${index}.accountNumber`)}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Bank" htmlFor={id("bankName")} error={accountErrors?.bankName?.message}>
                <Input
                  id={id("bankName")}
                  placeholder="e.g. Commercial Bank"
                  className="h-11"
                  aria-invalid={!!accountErrors?.bankName}
                  {...form.register(`bankAccounts.${index}.bankName`)}
                />
              </FormField>
              <FormField label="Branch" htmlFor={id("branch")} error={accountErrors?.branch?.message}>
                <Input
                  id={id("branch")}
                  placeholder="e.g. Kandy"
                  className="h-11"
                  aria-invalid={!!accountErrors?.branch}
                  {...form.register(`bankAccounts.${index}.branch`)}
                />
              </FormField>
            </div>
          </div>
        );
      })}
      {fields.length < MAX_BANK_ACCOUNTS && (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-fit"
          onClick={() => append({ accountName: "", accountNumber: "", bankName: "", branch: "" })}
        >
          <PlusIcon /> Add bank account
        </Button>
      )}
      {errors?.root?.message && <p className="text-sm text-destructive">{errors.root.message}</p>}
    </fieldset>
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
