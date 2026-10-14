"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import Image from "next/image";
import { ImagePlusIcon, StarIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/src/lib/supabase/client";
import {
  ALLOWED_IMAGE_TYPES,
  LISTING_IMAGES_BUCKET,
  MAX_IMAGE_BYTES,
  MAX_LISTING_IMAGES,
  listingImagePath,
} from "@/src/lib/listings";

type ImageUploaderProps = {
  images: string[];
  onImagesChange: Dispatch<SetStateAction<string[]>>;
  // Images already saved on the listing; the server action deletes those on save
  savedImages: string[];
  onUploadingChange: (uploading: boolean) => void;
};

// Uploads go straight from the browser to Storage (admin session + bucket
// policy), so files never pass through the 1MB Server Action body limit.
export function ImageUploader({
  images,
  onImagesChange,
  savedImages,
  onUploadingChange,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remaining = MAX_LISTING_IMAGES - images.length;

  async function handleFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;

    setError(null);
    if (files.length > remaining) {
      setError(`You can add ${remaining} more image${remaining === 1 ? "" : "s"}.`);
      return;
    }
    const invalid = files.find(
      (file) => !ALLOWED_IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES
    );
    if (invalid) {
      setError(`${invalid.name}: use a JPEG, PNG or WebP image under 5 MB.`);
      return;
    }

    setUploading(true);
    onUploadingChange(true);
    const storage = createClient().storage.from(LISTING_IMAGES_BUCKET);

    const results = await Promise.all(
      files.map(async (file) => {
        const path = `${crypto.randomUUID()}.${file.type.split("/")[1]}`;
        const { error } = await storage.upload(path, file, {
          contentType: file.type,
          cacheControl: "31536000",
        });
        return error ? null : storage.getPublicUrl(path).data.publicUrl;
      })
    );

    const uploaded = results.filter((url): url is string => url !== null);
    onImagesChange((current) => [...current, ...uploaded]);
    if (uploaded.length < files.length) {
      setError("Some images failed to upload. Please try again.");
    }
    setUploading(false);
    onUploadingChange(false);
  }

  function removeImage(url: string) {
    onImagesChange((current) => current.filter((image) => image !== url));
    // Not saved yet, so nothing else references it: delete right away
    if (!savedImages.includes(url)) {
      createClient().storage.from(LISTING_IMAGES_BUCKET).remove([listingImagePath(url)]);
    }
  }

  function makeCover(url: string) {
    onImagesChange((current) => [url, ...current.filter((image) => image !== url)]);
  }

  return (
    <div className="flex flex-col gap-3">
      {images.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((url, index) => (
            <li
              key={url}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              <Image src={url} alt="" fill sizes="160px" className="object-cover" />
              {index === 0 && (
                <span className="absolute bottom-1 left-1 rounded bg-background/90 px-1.5 text-xs font-medium">
                  Cover
                </span>
              )}
              <div className="absolute top-1 right-1 flex gap-1">
                {index > 0 && (
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="secondary"
                    onClick={() => makeCover(url)}
                    aria-label="Make cover image"
                  >
                    <StarIcon />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon-xs"
                  variant="secondary"
                  onClick={() => removeImage(url)}
                  aria-label="Remove image"
                >
                  <XIcon />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        multiple
        hidden
        onChange={(event) => handleFiles(event.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        disabled={uploading || remaining === 0}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlusIcon />
        {uploading ? "Uploading…" : "Add images"}
      </Button>
      <p className="text-xs text-muted-foreground">
        JPEG, PNG or WebP, up to 5 MB each. {images.length}/{MAX_LISTING_IMAGES} added.
        The first image is the cover.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
