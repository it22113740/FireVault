"use client";

import { TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Body of every error.tsx: friendly message + Retry, never a stack trace
export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this page. Please try again.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <TriangleAlertIcon className="size-6 text-destructive" />
      </span>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
