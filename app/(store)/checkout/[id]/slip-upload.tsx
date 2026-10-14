"use client";

import { useRef, useState } from "react";
import { FileCheckIcon, UploadIcon } from "lucide-react";
import {
  ALLOWED_SLIP_TYPES,
  MAX_SLIP_BYTES,
  PAYMENT_SLIPS_BUCKET,
} from "@/src/lib/order-schema";
import { createClient } from "@/src/lib/supabase/client";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

type SlipUploadProps = {
  onUploaded: (path: string | null) => void;
  onUploadingChange: (uploading: boolean) => void;
  invalid?: boolean;
};

// Uploads straight to the private payment-slips bucket as anon (insert-only
// policy), so the file never goes through the Server Action body limit
export function SlipUpload({ onUploaded, onUploadingChange, invalid }: SlipUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;

    setError(null);
    if (!ALLOWED_SLIP_TYPES.includes(file.type) || file.size > MAX_SLIP_BYTES) {
      setError("Use a JPEG, PNG, WebP or PDF under 5 MB.");
      return;
    }

    setUploading(true);
    onUploadingChange(true);
    const path = `${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
    const { error } = await createClient()
      .storage.from(PAYMENT_SLIPS_BUCKET)
      .upload(path, file, { contentType: file.type });

    if (error) {
      setError("Upload failed. Please try again.");
      setFileName(null);
      onUploaded(null);
    } else {
      setFileName(file.name);
      onUploaded(path);
    }
    setUploading(false);
    onUploadingChange(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_SLIP_TYPES.join(",")}
        hidden
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        data-invalid={invalid || undefined}
        className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center text-sm transition hover:border-primary/60 hover:bg-primary/5 disabled:opacity-60 data-invalid:border-destructive"
      >
        {fileName ? (
          <>
            <FileCheckIcon className="size-6 text-primary" />
            <span className="max-w-full truncate font-medium">{fileName}</span>
            <span className="text-xs text-muted-foreground">Tap to replace</span>
          </>
        ) : (
          <>
            <UploadIcon className="size-6 text-muted-foreground" />
            <span className="font-medium">
              {uploading ? "Uploading…" : "Upload payment slip"}
            </span>
            <span className="text-xs text-muted-foreground">
              Photo or screenshot (JPEG, PNG, WebP) or PDF, up to 5 MB
            </span>
          </>
        )}
      </button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
