import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LockIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Account inactive", robots: { index: false } };

// proxy.ts signs the user out when they land here
export default function InactivePage() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-warning/10">
        <LockIcon className="size-6 text-warning" />
      </span>
      <h1 className="text-2xl font-bold">Account inactive</h1>
      <Suspense fallback={<Skeleton className="h-28 w-full" />}>
        <InactiveMessage />
      </Suspense>
      <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
        Back to log in
      </Link>
    </div>
  );
}

async function InactiveMessage() {
  const settings = await getSettings();
  return (
    <>
      <p className="text-sm leading-relaxed text-muted-foreground">{settings.inactive_message}</p>
      <WhatsAppButton
        number={settings.admin_whatsapp}
        message="Hi, my FireVault seller account is inactive. How can I make the payment to reactivate it?"
        label="Contact the administrator"
        className="w-full"
      />
    </>
  );
}
