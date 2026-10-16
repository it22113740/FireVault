import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { SkeletonForm } from "@/components/skeletons";
import { requireStaff } from "@/lib/auth";
import { publishesDirectly } from "@/lib/listings";
import { getSellerOptions } from "@/lib/seller-options";
import { getSettings } from "@/lib/settings";
import { ListingForm } from "../listing-form";

export const metadata: Metadata = { title: "New listing" };

export default function NewListingPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="New listing" />
      <Suspense fallback={<SkeletonForm />}>
        <NewListing />
      </Suspense>
    </div>
  );
}

async function NewListing() {
  const [profile, settings] = await Promise.all([requireStaff(), getSettings()]);
  const sellers = profile.role === "super_admin" ? await getSellerOptions() : undefined;
  return (
    <ListingForm
      canPublish={publishesDirectly(profile)}
      sellers={sellers}
      regions={settings.regions}
      currency={settings.currency}
    />
  );
}
