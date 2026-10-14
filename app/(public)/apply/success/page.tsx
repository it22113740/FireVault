import type { Metadata } from "next";
import Link from "next/link";
import { MailCheckIcon } from "lucide-react";
import { FadeIn } from "@/components/motion";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Application sent", robots: { index: false } };

export default function ApplySuccessPage() {
  return (
    <FadeIn className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary/15">
        <MailCheckIcon className="size-7 text-primary" />
      </span>
      <h1 className="text-3xl font-bold">Application sent</h1>
      <p className="text-muted-foreground">
        We&apos;ll email you once it&apos;s reviewed. If you&apos;re approved, the email has a link
        to set your password.
      </p>
      <Button variant="outline" size="lg" render={<Link href="/" />} nativeButton={false}>
        Back to the store
      </Button>
    </FadeIn>
  );
}
