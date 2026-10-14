import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { ListingForm } from "../listing-form";
import { ListingFormSkeleton } from "../listing-form-skeleton";

export const metadata: Metadata = { title: "New listing" };

export default function NewListingPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="New listing" />
      <Suspense fallback={<ListingFormSkeleton />}>
        <NewListing />
      </Suspense>
    </div>
  );
}

async function NewListing() {
  const [profile, settings] = await Promise.all([requireStaff(), getSettings()]);
  return <ListingForm role={profile.role} regions={settings.regions} currency={settings.currency} />;
}
