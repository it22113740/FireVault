"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { EyeIcon, PencilIcon } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { ImagePicker } from "@/components/image-picker";
import { SellerAbout, SellerHeader } from "@/components/seller-profile";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveShop } from "@/lib/actions/shop";
import type { SellerSummary } from "@/lib/sellers";
import { showActionError } from "@/lib/forms";
import { stageImage } from "@/lib/stage-image";
import { cn } from "@/lib/utils";
import {
  SHOP_LIMITS,
  shopSchema,
  slugify,
  type ShopInput,
  type ShopOutput,
} from "@/lib/validations/shop";

type ShopFormProps = {
  defaults: ShopInput;
  logoUrl?: string;
  coverUrl?: string;
  siteUrl: string;
  onboarding?: boolean;
  /** Saved shop + its ratings and live listings, for the Preview tab */
  preview?: { seller: SellerSummary; reviews: React.ReactNode; listings: React.ReactNode };
};

type ImageField = "logo" | "cover";

export function ShopForm({ defaults, logoUrl, coverUrl, siteUrl, onboarding, preview }: ShopFormProps) {
  const router = useRouter();
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [pending, startTransition] = useTransition();
  const [files, setFiles] = useState<Record<ImageField, File | null>>({ logo: null, cover: null });
  const [progress, setProgress] = useState<Record<ImageField, number | null>>({ logo: null, cover: null });
  const [imageErrors, setImageErrors] = useState<Partial<Record<ImageField, string>>>({});
  // The link follows the shop name until the seller edits it themselves
  const [slugEdited, setSlugEdited] = useState(!onboarding);

  const form = useForm<ShopInput, unknown, ShopOutput>({
    resolver: zodResolver(shopSchema),
    mode: "onChange",
    defaultValues: defaults,
  });
  const { errors, isDirty } = form.formState;
  const [displayName, description, slug] = useWatch({
    control: form.control,
    name: ["displayName", "description", "slug"],
  });

  useEffect(() => {
    if (!slugEdited) form.setValue("slug", slugify(displayName), { shouldValidate: !!displayName });
  }, [displayName, slugEdited, form]);

  const hasUnsavedChanges = isDirty || files.logo !== null || files.cover !== null;
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges]);

  const onSubmit = form.handleSubmit(() => {
    const missing: Partial<Record<ImageField, string>> = {};
    if (!files.logo && !logoUrl) missing.logo = "Add your logo";
    if (!files.cover && !coverUrl) missing.cover = "Add a cover photo";
    setImageErrors(missing);
    if (missing.logo || missing.cover) return toast.error("Add your logo and cover photo.");

    startTransition(async () => {
      const values = form.getValues();
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => formData.set(key, value));

      // Images go to staging first (up to 30 MB each); the action converts them
      try {
        for (const field of ["logo", "cover"] as const) {
          const file = files[field];
          if (!file) continue;
          setProgress((current) => ({ ...current, [field]: 0 }));
          formData.set(
            field,
            await stageImage(file, (percent) => setProgress((current) => ({ ...current, [field]: percent })))
          );
        }
      } catch (error) {
        setProgress({ logo: null, cover: null });
        return void toast.error((error as Error).message);
      }

      const result = await saveShop(formData);
      setProgress({ logo: null, cover: null });
      if (!result.ok) {
        setImageErrors({ logo: result.fieldErrors?.logo?.[0], cover: result.fieldErrors?.cover?.[0] });
        return showActionError(result, form.setError);
      }

      form.reset(values);
      setFiles({ logo: null, cover: null });
      if (onboarding) {
        toast.success("Your shop is ready!");
        router.replace("/admin");
      } else {
        toast.success("Shop saved.");
        router.refresh();
      }
    });
  });

  function pickImage(field: ImageField) {
    return (file: File | null) => {
      setFiles((current) => ({ ...current, [field]: file }));
      setImageErrors((current) => ({ ...current, [field]: undefined }));
    };
  }

  const formElement = (
    <form onSubmit={onSubmit} hidden={view !== "edit"} className="flex max-w-3xl flex-col gap-6" noValidate>
      <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
        <FormField label="Logo" htmlFor="logo">
          <ImagePicker
            id="logo"
            aspect="square"
            label="Add logo"
            maxMb={30}
            file={files.logo}
            currentUrl={logoUrl}
            onFileChange={pickImage("logo")}
            progress={progress.logo}
            error={imageErrors.logo}
          />
        </FormField>
        <FormField label="Cover photo" htmlFor="cover">
          <ImagePicker
            id="cover"
            aspect="video"
            label="Add cover photo"
            maxMb={30}
            file={files.cover}
            currentUrl={coverUrl}
            onFileChange={pickImage("cover")}
            progress={progress.cover}
            error={imageErrors.cover}
          />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Shop name"
          htmlFor="displayName"
          error={errors.displayName?.message}
          counter={{ value: displayName.length, max: SHOP_LIMITS.name }}
        >
          <Input id="displayName" className="h-11" aria-invalid={!!errors.displayName} {...form.register("displayName")} />
        </FormField>
        <FormField
          label="Shop link"
          htmlFor="slug"
          hint={`${siteUrl.replace(/^https?:\/\//, "")}/sellers/${slug || "your-shop"}`}
          error={errors.slug?.message}
        >
          <Input
            id="slug"
            className="h-11 lowercase"
            aria-invalid={!!errors.slug}
            {...form.register("slug", { onChange: () => setSlugEdited(true) })}
          />
        </FormField>
      </div>

      <FormField
        label="Description"
        htmlFor="description"
        hint="What you sell, how fast you deliver, why buyers can trust you."
        error={errors.description?.message}
        counter={{ value: description.length, max: SHOP_LIMITS.description }}
      >
        <Textarea id="description" rows={5} aria-invalid={!!errors.description} {...form.register("description")} />
      </FormField>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-sm font-medium">Business platforms (optional)</legend>
        <FormField label="WhatsApp group link" htmlFor="whatsappGroupUrl" error={errors.whatsappGroupUrl?.message}>
          <Input
            id="whatsappGroupUrl"
            inputMode="url"
            placeholder="https://chat.whatsapp.com/…"
            className="h-11"
            aria-invalid={!!errors.whatsappGroupUrl}
            {...form.register("whatsappGroupUrl")}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="TikTok" htmlFor="tiktokUrl" error={errors.tiktokUrl?.message}>
            <Input
              id="tiktokUrl"
              inputMode="url"
              placeholder="https://www.tiktok.com/@yourshop"
              className="h-11"
              aria-invalid={!!errors.tiktokUrl}
              {...form.register("tiktokUrl")}
            />
          </FormField>
          <FormField label="Facebook" htmlFor="facebookUrl" error={errors.facebookUrl?.message}>
            <Input
              id="facebookUrl"
              inputMode="url"
              placeholder="https://facebook.com/yourshop"
              className="h-11"
              aria-invalid={!!errors.facebookUrl}
              {...form.register("facebookUrl")}
            />
          </FormField>
        </div>
      </fieldset>

      <FormField
        label="Total accounts sold"
        htmlFor="totalSold"
        hint="Shown on your shop page. Update it as you sell."
        error={errors.totalSold?.message}
      >
        <Input
          id="totalSold"
          inputMode="numeric"
          className="h-11 w-40 tabular-nums"
          aria-invalid={!!errors.totalSold}
          {...form.register("totalSold")}
        />
      </FormField>

      <SubmitButton size="lg" className="h-11 w-fit" pending={pending} pendingLabel="Saving…">
        {onboarding ? "Create my shop" : "Save shop"}
      </SubmitButton>
    </form>
  );

  if (!preview) return formElement;

  // The form stays mounted (just hidden) so switching tabs keeps unsaved edits
  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Shop" className="flex w-fit gap-1 rounded-xl border bg-muted/50 p-1">
        {([
          { value: "edit", label: "Edit", icon: PencilIcon },
          { value: "preview", label: "Preview", icon: EyeIcon },
        ] as const).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={view === value}
            onClick={() => setView(value)}
            className={cn(
              "flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
              view === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>
      {formElement}
      {view === "preview" && (
        <ShopPreview
          form={form}
          seller={preview.seller}
          reviews={preview.reviews}
          listings={preview.listings}
          logo={files.logo}
          cover={files.cover}
          logoUrl={logoUrl}
          coverUrl={coverUrl}
          unsaved={hasUnsavedChanges}
        />
      )}
    </div>
  );
}

// Blob URL for a picked (not yet uploaded) image, released when it changes
function useFileUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);
  return url;
}

// How the public /sellers/[slug] page will look, using the form's current
// (possibly unsaved) values on top of the saved shop's ratings and listings
function ShopPreview({
  form,
  seller,
  reviews,
  listings,
  logo,
  cover,
  logoUrl,
  coverUrl,
  unsaved,
}: {
  form: UseFormReturn<ShopInput, unknown, ShopOutput>;
  seller: SellerSummary;
  reviews: React.ReactNode;
  listings: React.ReactNode;
  logo: File | null;
  cover: File | null;
  logoUrl?: string;
  coverUrl?: string;
  unsaved: boolean;
}) {
  const values = useWatch({ control: form.control });
  const logoPreview = useFileUrl(logo);
  const coverPreview = useFileUrl(cover);
  const sold = Number(values.totalSold);

  const live: SellerSummary = {
    ...seller,
    name: values.displayName?.trim() || seller.name,
    slug: values.slug || seller.slug,
    description: values.description?.trim() ?? "",
    logoUrl: logoPreview ?? logoUrl ?? "",
    coverUrl: coverPreview ?? coverUrl ?? "",
    whatsappGroupUrl: values.whatsappGroupUrl?.trim() || null,
    tiktokUrl: values.tiktokUrl?.trim() || null,
    facebookUrl: values.facebookUrl?.trim() || null,
    totalSold: Number.isFinite(sold) && sold >= 0 ? sold : seller.totalSold,
  };

  return (
    <section aria-label="Shop preview" className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {unsaved
          ? "Showing your unsaved changes. Save the shop to make them live."
          : "This is how customers see your shop."}
      </p>
      {/* inert: links and buttons in the preview don't navigate away mid-edit */}
      <div inert className="overflow-hidden rounded-xl border bg-background pb-8 select-none">
        <SellerHeader seller={live} backLink={null} />
        <div className="flex flex-col gap-10 px-4 pt-8">
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-bold">Ratings &amp; reviews</h2>
            {reviews}
          </section>
          <SellerAbout description={live.description} />
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-bold">Accounts for sale</h2>
            {listings}
          </section>
        </div>
      </div>
    </section>
  );
}
