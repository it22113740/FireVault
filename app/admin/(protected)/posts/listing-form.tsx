"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { TagInput } from "@/components/ui/tag-input";
import { Textarea } from "@/components/ui/textarea";
import { EDITABLE_LISTING_STATUSES, type Listing } from "@/src/lib/listings";
import type { ListingFormState } from "./actions";
import { ImageUploader } from "./image-uploader";
import { StatusBadge } from "./status-badge";

type ListingFormProps = {
  action: (state: ListingFormState, formData: FormData) => Promise<ListingFormState>;
  listing?: Listing;
};

export function ListingForm({ action, listing }: ListingFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [images, setImages] = useState(listing?.images ?? []);
  const [highlights, setHighlights] = useState(listing?.highlights ?? []);
  const [uploading, setUploading] = useState(false);
  const errors = state?.fieldErrors ?? {};
  const statusEditable =
    !listing || (EDITABLE_LISTING_STATUSES as readonly string[]).includes(listing.status);

  // Submit manually so React doesn't reset the fields when validation fails
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-5">
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Field label="Title" htmlFor="title" error={errors.title}>
        <Input
          id="title"
          name="title"
          defaultValue={listing?.title}
          maxLength={200}
          required
          aria-invalid={!!errors.title}
        />
      </Field>

      <Field label="Description" htmlFor="description" error={errors.description}>
        <Textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={listing?.description ?? ""}
          maxLength={5000}
          aria-invalid={!!errors.description}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Price" htmlFor="price" error={errors.price}>
          <Input
            id="price"
            name="price"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            defaultValue={listing?.price}
            required
            aria-invalid={!!errors.price}
          />
        </Field>
        <Field label="Level" htmlFor="level" error={errors.level}>
          <Input
            id="level"
            name="level"
            type="number"
            min={0}
            step="1"
            inputMode="numeric"
            defaultValue={listing?.level ?? ""}
            aria-invalid={!!errors.level}
          />
        </Field>
        <Field label="Rank" htmlFor="rank" error={errors.rank}>
          <Input
            id="rank"
            name="rank"
            defaultValue={listing?.rank ?? ""}
            maxLength={50}
            placeholder="e.g. Heroic"
            aria-invalid={!!errors.rank}
          />
        </Field>
        <Field label="Region" htmlFor="region" error={errors.region}>
          <Input
            id="region"
            name="region"
            defaultValue={listing?.region ?? ""}
            maxLength={50}
            placeholder="e.g. India"
            aria-invalid={!!errors.region}
          />
        </Field>
      </div>

      <Field label="Highlights" htmlFor="highlights" error={errors.highlights}>
        <TagInput
          id="highlights"
          value={highlights}
          onChange={setHighlights}
          placeholder="Type and press Enter"
          maxTags={20}
          maxLength={80}
          aria-invalid={!!errors.highlights}
        />
        {highlights.map((highlight) => (
          <input key={highlight} type="hidden" name="highlights" value={highlight} />
        ))}
      </Field>

      <Field label="Images" error={errors.images}>
        <ImageUploader
          images={images}
          onImagesChange={setImages}
          savedImages={listing?.images ?? []}
          onUploadingChange={setUploading}
        />
        {images.map((url) => (
          <input key={url} type="hidden" name="images" value={url} />
        ))}
      </Field>

      <Field label="Status" htmlFor="status" error={errors.status}>
        {statusEditable ? (
          <NativeSelect
            id="status"
            name="status"
            defaultValue={listing?.status ?? "available"}
            className="w-48"
          >
            <NativeSelectOption value="available">Available</NativeSelectOption>
            <NativeSelectOption value="archived">Archived</NativeSelectOption>
          </NativeSelect>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge status={listing!.status} />
            Set by its order. Change it from the order instead.
          </p>
        )}
      </Field>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending || uploading}>
          {pending ? "Saving…" : listing ? "Save changes" : "Create listing"}
        </Button>
        <Button variant="outline" render={<Link href="/admin/posts" />} nativeButton={false}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error[0]}</p>}
    </div>
  );
}
