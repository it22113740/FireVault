import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSuperAdmin } from "@/lib/auth";
import { getSellers } from "@/lib/sellers";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";
import { IdCollegeManager } from "./id-college-manager";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Store-wide contact details, currency, regions and the bank account for top-up payments." />
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
  const [{ data: samples, error }, sellers] = await Promise.all([
    supabase.from("id_college_samples").select("*").order("slot"),
    getSellers(),
  ]);
  if (error) throw new Error("Couldn't load ID College samples");

  return (
    <>
    <SettingsForm
      defaults={{
        adminWhatsapp: settings.admin_whatsapp,
        currency: settings.currency,
        inactiveMessage: settings.inactive_message,
        regions: settings.regions.join(", "),
        bankAccountName: settings.bank_account_name,
        bankAccountNumber: settings.bank_account_number,
        bankName: settings.bank_name,
        bankBranch: settings.bank_branch,
        sellContactSellerIds: settings.sell_contact_seller_ids,
      }}
      sellers={sellers.map((seller) => ({ id: seller.id, name: seller.name, hasWhatsapp: !!seller.whatsappNumber }))}
    />
    <IdCollegeManager samples={samples ?? []} currency={settings.currency} />
    </>
  );
}
