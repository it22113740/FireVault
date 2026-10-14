"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon, UploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 4 * 1024 * 1024;

type ImagePickerProps = {
  id?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  // Shown until a new file is picked (e.g. the listing's current image)
  currentUrl?: string;
  error?: string;
  aspect?: "video" | "4/3" | "square" | "auto";
  label?: string;
};

// Instant local preview; the server re-checks type/size and converts to WebP
export function ImagePicker({
  id,
  file,
  onFileChange,
  currentUrl,
  error,
  aspect = "4/3",
  label = "Choose image",
}: ImagePickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  // Release the blob URL when the file changes or the picker unmounts
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleChange(selected: File | undefined) {
    if (input.current) input.current.value = "";
    if (!selected) return;
    if (!ACCEPTED.includes(selected.type)) return setLocalError("Use a JPG, PNG or WebP image.");
    if (selected.size > MAX_BYTES) return setLocalError("Images must be 4 MB or smaller.");
    setLocalError(null);
    onFileChange(selected);
  }

  const shown = preview ?? currentUrl;
  const message = localError ?? error;

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={input}
        id={id}
        type="file"
        accept={ACCEPTED.join(",")}
        className="sr-only"
        onChange={(event) => handleChange(event.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        data-invalid={message ? true : undefined}
        className={cn(
          "relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed bg-muted/40 text-sm transition-colors hover:border-primary/60 data-invalid:border-destructive",
          aspect === "video" && "aspect-video",
          aspect === "4/3" && "aspect-[4/3]",
          aspect === "square" && "aspect-square",
          aspect === "auto" && "min-h-40 py-8"
        )}
      >
        {shown ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob/preview URL */}
            <img src={shown} alt="" className="absolute inset-0 size-full object-contain" />
            <span className="absolute right-2 bottom-2 rounded-md bg-background/85 px-2 py-1 text-xs font-medium">
              Change image
            </span>
          </>
        ) : (
          <>
            <span className="flex size-10 items-center justify-center rounded-full bg-muted">
              <UploadIcon className="size-5 text-muted-foreground" />
            </span>
            <span className="font-medium">{label}</span>
            <span className="text-xs text-muted-foreground">JPG, PNG or WebP up to 4 MB</span>
          </>
        )}
      </button>
      {file && !message && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ImageIcon className="size-3.5" /> Will be converted to WebP when you save.
        </p>
      )}
      {message && (
        <p className="text-sm text-destructive" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
