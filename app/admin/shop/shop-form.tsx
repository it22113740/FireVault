"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { ImagePicker } from "@/components/image-picker";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveShop } from "@/lib/actions/shop";
import { showActionError } from "@/lib/forms";
import { stageImage } from "@/lib/stage-image";
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
};

type ImageField = "logo" | "cover";

export function ShopForm({ defaults, logoUrl, coverUrl, siteUrl, onboarding }: ShopFormProps) {
  const router = useRouter();
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

  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-6" noValidate>
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
}
