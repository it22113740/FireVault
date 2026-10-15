"use client";

import { Share2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Native share sheet on phones; copies the link elsewhere
export function ShareButton({ title, text }: { title: string; text?: string }) {
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // Closing the share sheet throws; nothing to do
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied.");
    } catch {
      toast.error("Couldn't copy the link.");
    }
  }

  return (
    <Button type="button" variant="outline" size="lg" className="h-11" onClick={share}>
      <Share2Icon /> Share
    </Button>
  );
}
