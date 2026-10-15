"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon, CloudIcon, Loader2Icon } from "lucide-react";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { ImagePicker } from "@/components/image-picker";
import { PublishStatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { saveListing } from "@/lib/actions/listings";
import { showActionError } from "@/lib/forms";
import { LISTING_IMAGE_SIZE, type PublishStatus } from "@/lib/listings";
import type { Role } from "@/lib/roles";
import { formatPriceInput } from "@/lib/validations/common";
import {
  LISTING_LIMITS,
  listingFormSchema,
  missingForSubmit,
  type ListingFormValues,
  type ListingIntent,
} from "@/lib/validations/listing";

const AUTOSAVE_MS = 10_000;

export type EditableListing = {
  id: string;
  title: string;
  description: string;
  price: number;
  region: string;
  imageUrl: string;
  publish_status: PublishStatus;
  rejection_reason: string | null;
};

type ListingFormProps = {
  role: Role;
  regions: string[];
  currency: string;
  listing?: EditableListing;
};

const SAVED_MESSAGE: Record<PublishStatus, string> = {
  draft: "Draft saved.",
  rejected: "Changes saved. Submit it again when you're ready.",
  pending_review: "Submitted for review.",
  published: "Listing is live.",
  archived: "Saved.",
};

export function ListingForm({ role, regions, currency, listing }: ListingFormProps) {
  const router = useRouter();
  const isSuperAdmin = role === "super_admin";
  const [id, setId] = useState(listing?.id ?? null);
  const [status, setStatus] = useState<PublishStatus | null>(listing?.publish_status ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState(listing?.imageUrl ?? "");
  const [imageError, setImageError] = useState<string>();
  const [pendingIntent, setPendingIntent] = useState<ListingIntent | null>(null);
  const [lastAutosave, setLastAutosave] = useState<Date | null>(null);
  const [autosaveRunning, setAutosaveRunning] = useState(false);
  const [, startTransition] = useTransition();
  const autosaving = useRef(false);

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    mode: "onChange",
    defaultValues: {
      title: listing?.title ?? "",
      description: listing?.description ?? "",
      price: listing?.price ? formatPriceInput(String(listing.price)) : "",
      region: listing?.region ?? "",
    },
  });
  const { errors, isDirty } = form.formState;
  const [title, description] = useWatch({ control: form.control, name: ["title", "description"] });
  const hasUnsavedChanges = isDirty || imageFile !== null;
  const isDraftLike = status === null || status === "draft" || status === "rejected";

  const buildFormData = useCallback(
    (intent: ListingIntent, values: ListingFormValues) => {
      const formData = new FormData();
      formData.set("intent", intent);
      if (id) formData.set("id", id);
      Object.entries(values).forEach(([key, value]) => formData.set(key, value));
      if (imageFile) formData.set("image", imageFile);
      return formData;
    },
    [id, imageFile]
  );

  // Autosave drafts every 10s while there are valid, unsaved changes
  useEffect(() => {
    if (!isDraftLike) return;
    const timer = setInterval(async () => {
      if (autosaving.current || pendingIntent || !hasUnsavedChanges) return;
      const values = form.getValues();
      if (!listingFormSchema.safeParse(values).success) return;

      autosaving.current = true;
      setAutosaveRunning(true);
      const result = await saveListing(buildFormData("autosave", values));
      autosaving.current = false;
      setAutosaveRunning(false);
      if (!result.ok) return;

      if (!id) {
        setId(result.data.id);
        // Keep the form mounted; just point the URL at the new draft
        window.history.replaceState(null, "", `/admin/listings/${result.data.id}/edit`);
      }
      setStatus(result.data.status);
      if (imageFile) {
        setImageFile(null);
        setImageUrl(result.data.imageUrl);
      }
      form.reset(values, { keepErrors: true });
      setLastAutosave(new Date());
    }, AUTOSAVE_MS);
    return () => clearInterval(timer);
  }, [isDraftLike, pendingIntent, hasUnsavedChanges, form, buildFormData, id, imageFile]);

  // Warn before closing or reloading the tab with unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges]);

  function save(intent: ListingIntent) {
    return form.handleSubmit((values) => {
      if (intent === "submit" || intent === "publish") {
        const missing = missingForSubmit(values, imageFile !== null || imageUrl !== "");
        const { image, ...fields } = missing;
        Object.entries(fields).forEach(([field, message]) =>
          form.setError(field as keyof ListingFormValues, { message })
        );
        setImageError(image);
        if (Object.keys(missing).length > 0) {
          toast.error("Complete the listing first.");
          return;
        }
      }

      setPendingIntent(intent);
      startTransition(async () => {
        const result = await saveListing(buildFormData(intent, values));
        setPendingIntent(null);
        if (!result.ok) {
          setImageError(result.fieldErrors?.image?.[0]);
          return showActionError(result, form.setError);
        }
        form.reset(values);
        setImageFile(null);
        toast.success(SAVED_MESSAGE[result.data.status]);
        router.push("/admin/listings");
      });
    })();
  }

  const buttons: { intent: ListingIntent; label: string; pendingLabel: string; primary?: boolean }[] =
    isSuperAdmin
      ? status === "published"
        ? [{ intent: "publish", label: "Save changes", pendingLabel: "Saving…", primary: true }]
        : [
            { intent: "draft", label: "Save draft", pendingLabel: "Saving…" },
            { intent: "publish", label: "Publish", pendingLabel: "Publishing…", primary: true },
          ]
      : status === "published"
        ? [{ intent: "submit", label: "Submit changes for review", pendingLabel: "Submitting…", primary: true }]
        : [
            { intent: "draft", label: "Save draft", pendingLabel: "Saving…" },
            { intent: "submit", label: "Submit for review", pendingLabel: "Submitting…", primary: true },
          ];
  const primaryIntent = buttons.find((button) => button.primary)!.intent;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save(primaryIntent);
      }}
      className="flex max-w-3xl flex-col gap-6"
      noValidate
    >
      {status === "rejected" && listing?.rejection_reason && (
        <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
          <CircleAlertIcon />
          <AlertTitle>Changes requested</AlertTitle>
          <AlertDescription>{listing.rejection_reason}</AlertDescription>
        </Alert>
      )}
      {!isSuperAdmin && status === "published" && (
        <Alert>
          <CircleAlertIcon />
          <AlertTitle>This listing is live</AlertTitle>
          <AlertDescription>
            Submitting changes sends it back to review and hides it from the store until it&apos;s
            approved. To mark it reserved, use the toggle on the listings page instead.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="flex flex-col gap-5">
          <FormField
            label="Title"
            htmlFor="title"
            error={errors.title?.message}
            counter={{ value: title.length, max: LISTING_LIMITS.title }}
          >
            <Input
              id="title"
              className="h-11"
              placeholder="e.g. Level 72 Elite Pass, 40 rare skins"
              aria-invalid={!!errors.title}
              {...form.register("title")}
            />
          </FormField>

          <FormField
            label="Description"
            htmlFor="description"
            hint="Plain text. Describe what's included in the account."
            error={errors.description?.message}
            counter={{ value: description.length, max: LISTING_LIMITS.description }}
          >
            <Textarea
              id="description"
              rows={8}
              aria-invalid={!!errors.description}
              {...form.register("description")}
            />
          </FormField>

          <div className="grid gap-5 sm:grid-cols-2">
            <PriceField form={form} currency={currency} error={errors.price?.message} />
            <FormField label="Region" htmlFor="region" error={errors.region?.message}>
              <NativeSelect
                id="region"
                className="w-full [&_select]:h-11"
                aria-invalid={!!errors.region}
                {...form.register("region")}
              >
                <NativeSelectOption value="">Choose a region</NativeSelectOption>
                {regions.map((region) => (
                  <NativeSelectOption key={region} value={region}>
                    {region}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>
          </div>
        </div>

        <FormField
          label="Image"
          htmlFor="image"
          hint={`Use a portrait ${LISTING_IMAGE_SIZE.width} × ${LISTING_IMAGE_SIZE.height} image so it fills the card.`}
        >
          <ImagePicker
            aspect="portrait"
            id="image"
            file={imageFile}
            currentUrl={imageUrl}
            onFileChange={(file) => {
              setImageFile(file);
              setImageError(undefined);
            }}
            error={imageError}
          />
        </FormField>
      </div>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t bg-background/90 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-xl sm:border">
        {status && <PublishStatusBadge status={status} />}
        <AutosaveStatus visible={isDraftLike} saving={autosaveRunning} lastSaved={lastAutosave} dirty={hasUnsavedChanges} />
        <div className="ml-auto flex flex-wrap gap-2">
          {buttons.map((button) => (
            <Button
              key={button.intent}
              type="button"
              size="lg"
              variant={button.primary ? "default" : "outline"}
              className="h-11"
              disabled={pendingIntent !== null}
              onClick={() => save(button.intent)}
            >
              {pendingIntent === button.intent && <Loader2Icon className="animate-spin" />}
              {pendingIntent === button.intent ? button.pendingLabel : button.label}
            </Button>
          ))}
        </div>
      </div>
    </form>
  );
}

function PriceField({
  form,
  currency,
  error,
}: {
  form: UseFormReturn<ListingFormValues>;
  currency: string;
  error?: string;
}) {
  const field = form.register("price");
  return (
    <FormField label={`Price (${currency})`} htmlFor="price" error={error}>
      <Input
        id="price"
        inputMode="decimal"
        className="h-11 tabular-nums"
        placeholder="15,000"
        aria-invalid={!!error}
        {...field}
        onChange={(event) => {
          event.target.value = formatPriceInput(event.target.value);
          field.onChange(event);
        }}
      />
    </FormField>
  );
}

function AutosaveStatus({
  visible,
  saving,
  lastSaved,
  dirty,
}: {
  visible: boolean;
  saving: boolean;
  lastSaved: Date | null;
  dirty: boolean;
}) {
  if (!visible) return null;
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
      <CloudIcon className="size-3.5" />
      {saving
        ? "Saving draft…"
        : dirty
          ? "Unsaved changes"
          : lastSaved
            ? `Draft saved ${lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
            : "Drafts save automatically"}
    </span>
  );
}
