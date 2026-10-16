"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftRightIcon, CircleAlertIcon, CloudIcon, Loader2Icon } from "lucide-react";
import { Controller, useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { ImagePicker } from "@/components/image-picker";
import { PublishStatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { saveListing } from "@/lib/actions/listings";
import { showActionError } from "@/lib/forms";
import { stageImage } from "@/lib/stage-image";
import { cn } from "@/lib/utils";
import { LISTING_IMAGE_SIZE, type PublishStatus } from "@/lib/listings";
import type { SellerOption } from "@/lib/seller-options";
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
  exchange_available: boolean;
  /** Shops it's listed under, in display order ([] = FireVault's own) */
  sellerIds: string[];
  imageUrl: string;
  publish_status: PublishStatus;
  rejection_reason: string | null;
};

type ListingFormProps = {
  /** Super admin, or a seller whose listings skip review */
  canPublish: boolean;
  /** Super admin only: shops the listing can be filed under */
  sellers?: SellerOption[];
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

// cacheComponents keeps visited routes alive in a hidden <Activity>, so without
// this key a second "New listing" visit would show the last listing's values
// (and its id, so saving would overwrite it). bfcacheId changes on every
// push/replace navigation but not on back/forward, so drafts survive Back.
export function ListingForm(props: ListingFormProps) {
  const { bfcacheId } = useRouter();
  return <ListingFormFields key={bfcacheId} {...props} />;
}

function ListingFormFields({ canPublish, sellers, regions, currency, listing }: ListingFormProps) {
  const router = useRouter();
  const [id, setId] = useState(listing?.id ?? null);
  const [status, setStatus] = useState<PublishStatus | null>(listing?.publish_status ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState(listing?.imageUrl ?? "");
  const [imageError, setImageError] = useState<string>();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
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
      exchangeAvailable: listing?.exchange_available ?? false,
      sellerIds: listing?.sellerIds ?? [],
    },
  });
  const { errors, isDirty } = form.formState;
  const [title, description] = useWatch({ control: form.control, name: ["title", "description"] });
  const hasUnsavedChanges = isDirty || imageFile !== null;
  const isDraftLike = status === null || status === "draft" || status === "rejected";

  // A new image is uploaded to staging first (up to 30 MB, with progress);
  // the action converts it to WebP. Throws if the upload fails.
  const buildFormData = useCallback(
    async (intent: ListingIntent, values: ListingFormValues) => {
      const formData = new FormData();
      formData.set("intent", intent);
      if (id) formData.set("id", id);
      Object.entries(values).forEach(([key, value]) => formData.set(key, String(value)));
      if (imageFile) {
        setUploadProgress(0);
        formData.set("stagedImage", await stageImage(imageFile, setUploadProgress));
      }
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
      const file = imageFile;
      const result = await buildFormData("autosave", values)
        .then(saveListing)
        .catch(() => null);
      autosaving.current = false;
      setAutosaveRunning(false);
      setUploadProgress(null);
      if (!result?.ok) return;

      if (!id) {
        setId(result.data.id);
        // Keep the form mounted; just point the URL at the new draft
        window.history.replaceState(null, "", `/admin/listings/${result.data.id}/edit`);
      }
      setStatus(result.data.status);
      // Only clear the picker if no newer image was chosen meanwhile
      if (file) {
        setImageFile((current) => (current === file ? null : current));
        setImageUrl(result.data.imageUrl);
      }
      // Mark the snapshot as saved without writing it back into the inputs:
      // anything typed while the save was in flight stays and is still dirty
      form.reset(values, { keepValues: true, keepErrors: true });
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
        let formData: FormData;
        try {
          formData = await buildFormData(intent, values);
        } catch (error) {
          setPendingIntent(null);
          setUploadProgress(null);
          setImageError((error as Error).message);
          return void toast.error((error as Error).message);
        }
        const result = await saveListing(formData);
        setPendingIntent(null);
        setUploadProgress(null);
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
    canPublish
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
      {!canPublish && status === "published" && (
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

          {sellers && (
            <Controller
              control={form.control}
              name="sellerIds"
              render={({ field }) => (
                <SellerPicker
                  sellers={sellers}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.sellerIds?.message ?? errors.sellerIds?.root?.message}
                />
              )}
            />
          )}

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

          <Controller
            control={form.control}
            name="exchangeAvailable"
            render={({ field }) => (
              <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3">
                <span>
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <ArrowLeftRightIcon className="size-4 text-primary" /> Exchange possible
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Customers can offer another account in exchange. Changing this never sends a live
                    listing back to review.
                  </span>
                </span>
                <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Exchange possible" />
              </label>
            )}
          />
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
            maxMb={30}
            progress={uploadProgress}
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

// Super admin: which shops the listing is shown under. Ticked order is the
// order buyers see the sellers in.
function SellerPicker({
  sellers,
  value,
  onChange,
  error,
}: {
  sellers: SellerOption[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}) {
  const names = value.map((id) => sellers.find((seller) => seller.id === id)?.name ?? "Unknown seller");
  const hint =
    value.length === 0
      ? "None ticked: FireVault's own listing. Buyers message the admin WhatsApp."
      : value.length === 1
        ? `${names[0]} owns this listing: buyers message their WhatsApp and they manage it from their dashboard.`
        : `Shared listing under ${value.length} shops. Buyers choose a seller to message. Only you can edit it; any of these sellers can mark it Reserved.`;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">Sellers</legend>
      <ul
        className={cn(
          "flex max-h-56 flex-col divide-y overflow-y-auto rounded-xl border bg-card",
          error && "border-destructive"
        )}
      >
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
                    onChange(
                      event.target.checked ? [...value, seller.id] : value.filter((id) => id !== seller.id)
                    )
                  }
                />
                <span className="min-w-0 flex-1 truncate">
                  {seller.name}
                  {!seller.active && <span className="text-muted-foreground"> (inactive)</span>}
                </span>
                {checked && value.length > 1 && (
                  <span className="text-xs text-muted-foreground tabular-nums">#{position + 1}</span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </fieldset>
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
