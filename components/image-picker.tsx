"use client";

import { useCallback, useRef, useState } from "react";
import { CheckCircle2Icon, ImageIcon, UploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const EXTENSION_TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

// Some Android galleries and file managers hand over photos with no MIME type;
// fall back to the extension (the server checks the real format anyway)
function imageType(file: File) {
  return file.type || EXTENSION_TYPES[file.name.split(".").pop()?.toLowerCase() ?? ""] || "";
}

type ImagePickerProps = {
  id?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  // Shown until a new file is picked (e.g. the listing's current image)
  currentUrl?: string;
  error?: string;
  aspect?: "video" | "4/3" | "square" | "portrait" | "auto";
  label?: string;
  maxMb?: number;
  // Upload progress 0–100 while the file is being sent; null when idle
  progress?: number | null;
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
  maxMb = 4,
  progress = null,
}: ImagePickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState<File | null>(null);

  // Each time the preview <img> attaches it gets a fresh blob URL, released
  // when it detaches, so the URL is never revoked while still shown (Strict
  // Mode and remounts re-run ref callbacks the same way)
  const attachPreview = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img || !file) return;
      const url = URL.createObjectURL(file);
      img.src = url;
      return () => URL.revokeObjectURL(url);
    },
    [file]
  );

  function handleChange(selected: File | undefined) {
    if (input.current) input.current.value = "";
    if (!selected) return;
    const type = imageType(selected);
    if (!ACCEPTED.includes(type)) return setLocalError("Use a JPG, PNG or WebP image. On iPhone, a screenshot works.");
    if (selected.size > maxMb * 1024 * 1024) {
      return setLocalError(`Images must be ${maxMb} MB or smaller.`);
    }
    setLocalError(null);
    onFileChange(selected.type ? selected : new File([selected], selected.name, { type }));
  }

  // A picked file the browser can't draw still shows as attached
  const unreadable = !!file && previewFailed === file;
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
        disabled={progress !== null}
        data-invalid={message ? true : undefined}
        className={cn(
          "relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed bg-muted/40 text-sm transition-colors hover:border-primary/60 disabled:pointer-events-none data-invalid:border-destructive",
          aspect === "video" && "aspect-video",
          aspect === "4/3" && "aspect-[4/3]",
          aspect === "square" && "aspect-square",
          aspect === "portrait" && "aspect-[35/52]",
          aspect === "auto" && "min-h-40 py-8"
        )}
      >
        {unreadable ? (
          <>
            <CheckCircle2Icon className="size-8 text-success" />
            <span className="max-w-full truncate px-4 font-medium">{file.name}</span>
            <span className="text-xs text-muted-foreground">Image attached · tap to change</span>
          </>
        ) : file || currentUrl ? (
          <>
            {file ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob URL
              <img
                key={`${file.name}-${file.lastModified}-${file.size}`}
                ref={attachPreview}
                alt=""
                className="absolute inset-0 size-full object-contain"
                onError={() => setPreviewFailed(file)}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- remote preview URL
              <img src={currentUrl} alt="" className="absolute inset-0 size-full object-contain" />
            )}
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
            <span className="text-xs text-muted-foreground">JPG, PNG or WebP up to {maxMb} MB</span>
          </>
        )}
      </button>
      {progress !== null && (
        <div className="flex flex-col gap-1" aria-live="polite">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Upload progress"
          >
            <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            {progress < 100 ? `Uploading ${progress}%` : "Converting to WebP…"}
          </p>
        </div>
      )}
      {file && progress === null && !message && (
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
