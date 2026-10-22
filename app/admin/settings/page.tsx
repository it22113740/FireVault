import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSuperAdmin } from "@/lib/auth";
import { getPaymentOptions } from "@/lib/payments";
import { getSellers } from "@/lib/sellers";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";
import { IdCollegeManager } from "./id-college-manager";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Store-wide contact details, currency, regions and how customers pay for top-ups." />
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
        bankAccounts: getPaymentOptions(settings).bank,
        ezcashNumber: settings.ezcash_number,
        ezcashMessageEn: settings.ezcash_message_en,
        ezcashMessageSi: settings.ezcash_message_si,
        ezcashMessageTa: settings.ezcash_message_ta,
        binancePayId: settings.binance_pay_id,
        binanceName: settings.binance_name,
        sellContactSellerIds: settings.sell_contact_seller_ids,
      }}
      sellers={sellers.map((seller) => ({ id: seller.id, name: seller.name, hasWhatsapp: !!seller.whatsappNumber }))}
    />
    <IdCollegeManager samples={samples ?? []} currency={settings.currency} />
    </>
  );
}
