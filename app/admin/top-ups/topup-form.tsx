"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { ImagePicker } from "@/components/image-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { saveTopup } from "@/lib/actions/topups";
import { showActionError } from "@/lib/forms";
import { stageImage } from "@/lib/stage-image";
import { TOPUP_CATEGORIES, type TopupCategory } from "@/lib/topups";
import { formatPriceInput } from "@/lib/validations/common";
import {
  TOPUP_LIMITS,
  missingForPublish,
  topupFormSchema,
  type TopupFormValues,
  type TopupIntent,
} from "@/lib/validations/topup";

export type EditableTopup = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: TopupCategory;
  imageUrl: string;
  published: boolean;
};

export function TopupForm({
  currency,
  topup,
  defaultCategory,
}: {
  currency: string;
  topup?: EditableTopup;
  defaultCategory: TopupCategory;
}) {
  const router = useRouter();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string>();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [pendingIntent, setPendingIntent] = useState<TopupIntent | null>(null);
  const [, startTransition] = useTransition();

  const form = useForm<TopupFormValues>({
    resolver: zodResolver(topupFormSchema),
    mode: "onChange",
    defaultValues: {
      name: topup?.name ?? "",
      description: topup?.description ?? "",
      price: topup?.price ? formatPriceInput(String(topup.price)) : "",
      category: topup?.category ?? defaultCategory,
    },
  });
  const { errors, isDirty } = form.formState;
  const [name, description] = useWatch({ control: form.control, name: ["name", "description"] });
  const hasUnsavedChanges = isDirty || imageFile !== null;
  const priceField = form.register("price");

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges]);

  function save(intent: TopupIntent) {
    return form.handleSubmit((values) => {
      if (intent === "publish") {
        const { image, ...fields } = missingForPublish(values, imageFile !== null || !!topup?.imageUrl);
        Object.entries(fields).forEach(([field, message]) =>
          form.setError(field as keyof TopupFormValues, { message })
        );
        setImageError(image);
        if (image || Object.keys(fields).length > 0) return toast.error("Complete the top-up first.");
      }

      const formData = new FormData();
      formData.set("intent", intent);
      if (topup) formData.set("id", topup.id);
      Object.entries(values).forEach(([key, value]) => formData.set(key, value));

      setPendingIntent(intent);
      startTransition(async () => {
        // New image goes to staging first (up to 30 MB); the action converts it
        if (imageFile) {
          try {
            setUploadProgress(0);
            formData.set("stagedImage", await stageImage(imageFile, setUploadProgress));
          } catch (error) {
            setPendingIntent(null);
            setUploadProgress(null);
            setImageError((error as Error).message);
            return void toast.error((error as Error).message);
          }
        }
        const result = await saveTopup(formData);
        setPendingIntent(null);
        setUploadProgress(null);
        if (!result.ok) {
          setImageError(result.fieldErrors?.image?.[0]);
          return showActionError(result, form.setError);
        }
        form.reset(values);
        setImageFile(null);
        toast.success(intent === "publish" ? `${values.name} is live.` : "Draft saved.");
        router.push(`/admin/top-ups?category=${values.category}`);
      });
    })();
  }

  const buttons: { intent: TopupIntent; label: string; pendingLabel: string; primary?: boolean }[] =
    topup?.published
      ? [{ intent: "publish", label: "Save changes", pendingLabel: "Saving…", primary: true }]
      : [
          { intent: "draft", label: "Save draft", pendingLabel: "Saving…" },
          { intent: "publish", label: "Publish", pendingLabel: "Publishing…", primary: true },
        ];

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save(topup?.published ? "publish" : "draft");
      }}
      className="flex max-w-3xl flex-col gap-6"
      noValidate
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
            <FormField
              label="Name"
              htmlFor="name"
              error={errors.name?.message}
              counter={{ value: name.length, max: TOPUP_LIMITS.name }}
            >
              <Input
                id="name"
                className="h-11"
                placeholder="e.g. 520 Diamonds"
                aria-invalid={!!errors.name}
                {...form.register("name")}
              />
            </FormField>
            <FormField label="Category" htmlFor="category" error={errors.category?.message}>
              <NativeSelect id="category" className="w-full [&_select]:h-11" {...form.register("category")}>
                {TOPUP_CATEGORIES.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>
          </div>
          <FormField
            label="Description"
            htmlFor="description"
            hint="Plain text. What the customer gets and how long delivery takes."
            error={errors.description?.message}
            counter={{ value: description.length, max: TOPUP_LIMITS.description }}
          >
            <Textarea id="description" rows={5} aria-invalid={!!errors.description} {...form.register("description")} />
          </FormField>
          <FormField label={`Price (${currency})`} htmlFor="price" error={errors.price?.message}>
            <Input
              id="price"
              inputMode="decimal"
              placeholder="1,500"
              className="h-11 tabular-nums sm:max-w-48"
              aria-invalid={!!errors.price}
              {...priceField}
              onChange={(event) => {
                event.target.value = formatPriceInput(event.target.value);
                priceField.onChange(event);
              }}
            />
          </FormField>
        </div>
        <FormField label="Image" htmlFor="image">
          <ImagePicker
            id="image"
            file={imageFile}
            currentUrl={topup?.imageUrl}
            maxMb={30}
            progress={uploadProgress}
            onFileChange={(file) => {
              setImageFile(file);
              setImageError(undefined);
            }}
            error={imageError}
            aspect="square"
          />
        </FormField>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
        {buttons.map((button) => (
          <Button
            key={button.intent}
            type="button"
            size="lg"
            className="h-11"
            variant={button.primary ? "default" : "outline"}
            disabled={pendingIntent !== null}
            onClick={() => save(button.intent)}
          >
            {pendingIntent === button.intent && <Loader2Icon className="animate-spin" />}
            {pendingIntent === button.intent ? button.pendingLabel : button.label}
          </Button>
        ))}
      </div>
    </form>
  );
}
