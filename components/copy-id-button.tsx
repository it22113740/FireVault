"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";

// Customers paste the listing ID into WhatsApp (PLAN.md UX details)
export function CopyIdButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`Copied ID ${value}`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Long-press the ID to copy it.");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 font-mono text-sm transition-colors hover:border-primary/50 active:scale-[0.97]"
      aria-label={`Copy listing ID ${value}`}
    >
      ID {value}
      {copied ? <CheckIcon className="size-4 text-success" /> : <CopyIcon className="size-4 text-muted-foreground" />}
    </button>
  );
}
