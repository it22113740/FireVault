import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Store-wide contact details, currency and regions." />
      <Suspense fallback={<Skeleton className="h-96 max-w-xl" />}>
        <Settings />
      </Suspense>
    </div>
  );
}

async function Settings() {
  await requireSuperAdmin();
  // Read fresh (not the public cache) so the form shows what's saved
  const supabase = await createClient();
  const { data: settings } = await supabase.from("app_settings").select("*").eq("id", 1).single();
  if (!settings) throw new Error("Settings row is missing");

  return (
    <SettingsForm
      defaults={{
        adminWhatsapp: settings.admin_whatsapp,
        currency: settings.currency,
        inactiveMessage: settings.inactive_message,
        regions: settings.regions.join(", "),
      }}
    />
  );
}
